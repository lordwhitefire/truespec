/**
 * The small read-only part of the Neon API the reset needs: the project's branches and compute
 * endpoints, enough to prove that the configured demo URL is the configured demo branch and not a
 * read-only replica or a branch in another project.
 *
 * Only GET requests. The API key is sent in the Authorization header and never logged. An
 * unreachable API, a non-2xx answer, an unreadable body or a missing branch/endpoint is a refusal:
 * the reset never assumes the URL is safe because its host looks right.
 *
 * Current API shape (checked against Neon's reference, 2026-10):
 *   GET /projects/{project_id}/branches   -> { branches: [{ id, project_id, name, default, ... }] }
 *   GET /projects/{project_id}/endpoints  -> { endpoints: [{ id, project_id, branch_id, type, host,
 *                                              hosts: { read_write_host, read_write_pooled_host,
 *                                                       read_only_host, read_only_pooled_host }, ... }] }
 */
import { connectionIdentity } from "./backup-restore";

const NEON_API_BASE = "https://console.neon.tech/api/v2";
const DEFAULT_TIMEOUT_MS = 10_000;

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type NeonBranch = {
  id: string;
  project_id: string;
  name: string;
  default: boolean;
  primary?: boolean;
};

export type NeonEndpoint = {
  id: string;
  project_id: string;
  branch_id: string;
  type: string;
  host: string;
  hosts?: {
    read_write_host?: string;
    read_write_pooled_host?: string;
    read_only_host?: string;
    read_only_pooled_host?: string;
  };
  disabled?: boolean;
};

export class NeonApiError extends Error {
  constructor(
    readonly step: string,
    message: string,
  ) {
    super(message);
    this.name = "NeonApiError";
  }
}

export type NeonApiDeps = {
  fetch?: FetchLike;
  timeoutMs?: number;
};

/**
 * Neon's pooled host inserts `-pooler` before the region suffix. The reset compares the URL host
 * with the endpoint hosts after this normalisation; the endpoint's `type` is still checked, so a
 * read-only endpoint is never accepted just because its host normalises to the same name.
 */
export function normalizeNeonHost(host: string): string {
  return host.trim().toLowerCase().replace(/-pooler(?=\.)/, "");
}

function requestUrl(path: string): URL {
  return new URL(`${NEON_API_BASE}${path}`);
}

async function getJson<T>(
  url: URL,
  apiKey: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new NeonApiError("target", "the Neon API could not be reached");
  }

  if (!response.ok) {
    throw new NeonApiError("target", `the Neon API refused the request (HTTP ${response.status})`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new NeonApiError("target", "the Neon API returned an unreadable response");
  }
}

async function listPaginated<T, K extends string>(
  path: string,
  key: K,
  projectId: string,
  apiKey: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
  extraParams?: Record<string, string>,
): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;

  do {
    const url = requestUrl(path.replace("{project_id}", encodeURIComponent(projectId)));
    for (const [name, value] of Object.entries(extraParams ?? {})) {
      url.searchParams.set(name, value);
    }
    if (cursor) url.searchParams.set("cursor", cursor);

    const body = await getJson<Record<string, unknown>>(url, apiKey, fetchImpl, timeoutMs);
    const page = body[key];
    if (!Array.isArray(page)) {
      throw new NeonApiError("target", `the Neon API returned an unreadable ${key} list`);
    }
    items.push(...(page as T[]));

    const pagination = body.pagination;
    const next =
      pagination && typeof pagination === "object" && "next" in pagination
        ? (pagination as { next?: unknown }).next
        : undefined;
    if (typeof next !== "string" || next.length === 0) {
      cursor = undefined;
    } else {
      if (seen.has(next)) {
        throw new NeonApiError("target", "the Neon API returned a repeating pagination cursor");
      }
      seen.add(next);
      cursor = next;
    }
  } while (cursor);

  return items;
}

export async function listBranches(
  projectId: string,
  apiKey: string,
  deps: NeonApiDeps = {},
): Promise<NeonBranch[]> {
  return listPaginated<NeonBranch, "branches">(
    "/projects/{project_id}/branches",
    "branches",
    projectId,
    apiKey,
    deps.fetch ?? fetch,
    deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    { limit: "100" },
  );
}

export async function listEndpoints(
  projectId: string,
  apiKey: string,
  deps: NeonApiDeps = {},
): Promise<NeonEndpoint[]> {
  return listPaginated<NeonEndpoint, "endpoints">(
    "/projects/{project_id}/endpoints",
    "endpoints",
    projectId,
    apiKey,
    deps.fetch ?? fetch,
    deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
}

export type DemoBranchProof = {
  branch: NeonBranch;
  endpoint: NeonEndpoint;
};

/**
 * The four checks, all required:
 *   1. the branch id equals the configured id;
 *   2. its name is exactly `demo`;
 *   3. its `default` flag is exactly false;
 *   4. the configured URL's host is a read-write endpoint of that same branch and project.
 *
 * The endpoint list is read even when the branch looks right, and the host is compared after
 * pooled/direct normalisation. A read-only endpoint or an endpoint belonging to another branch is
 * never accepted.
 */
export async function verifyDemoBranch(input: {
  apiKey: string;
  projectId: string;
  branchId: string;
  demoDatabaseUrl: string;
  fetch?: FetchLike;
  timeoutMs?: number;
}): Promise<DemoBranchProof> {
  const fetchImpl = input.fetch ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const branches = await listBranches(input.projectId, input.apiKey, {
    fetch: fetchImpl,
    timeoutMs,
  });
  const branch = branches.find((item) => item.id === input.branchId);
  if (!branch) {
    throw new NeonApiError("target", "the configured branch is not in the Neon project");
  }
  if (branch.project_id !== input.projectId) {
    throw new NeonApiError("target", "the configured branch belongs to another Neon project");
  }
  if (branch.name !== "demo") {
    throw new NeonApiError("target", "the configured branch is not named demo");
  }
  if (branch.default !== false) {
    throw new NeonApiError("target", "the configured branch is the project's default branch");
  }

  let host: string;
  try {
    host = normalizeNeonHost(connectionIdentity(input.demoDatabaseUrl).host);
  } catch {
    throw new NeonApiError("target", "DEMO_DATABASE_URL is not a valid PostgreSQL URL");
  }

  const endpoints = await listEndpoints(input.projectId, input.apiKey, {
    fetch: fetchImpl,
    timeoutMs,
  });
  const branchEndpoints = endpoints.filter(
    (item) => item.project_id === input.projectId && item.branch_id === input.branchId,
  );
  if (branchEndpoints.length === 0) {
    throw new NeonApiError("target", "the configured branch has no compute endpoint");
  }

  const endpoint = branchEndpoints.find((item) => {
    if (item.type !== "read_write" || item.disabled === true) return false;
    const hosts = [
      item.host,
      item.hosts?.read_write_host,
      item.hosts?.read_write_pooled_host,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);
    return hosts.some((candidate) => normalizeNeonHost(candidate) === host);
  });

  if (!endpoint) {
    throw new NeonApiError(
      "target",
      "the demo URL host is not a read-write endpoint of the configured branch",
    );
  }

  return { branch, endpoint };
}
