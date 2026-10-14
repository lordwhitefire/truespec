// Fail-loud configuration. A broken page must never render in place of a
// configuration error (TASK-001 item 2 / benchmark J2). Values are never logged.

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type AppConfig = {
  databaseUrl: string;
  clerkPublishableKey: string;
  clerkSecretKey: string;
  sanityProjectId: string;
  sanityDataset: string;
  sanityToken: string;
  sessionSecret: string;
};

const REQUIRED = [
  "DATABASE_URL",
  // Clerk's CLI writes the NEXT_PUBLIC_-prefixed name (Next must expose the
  // publishable key to the browser). Read the standard name it actually writes.
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "SANITY_PROJECT_ID",
  "SANITY_DATASET",
  "SANITY_TOKEN",
  "SESSION_SECRET",
] as const;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const missing: string[] = [];
  const read = (name: (typeof REQUIRED)[number]): string => {
    const value = process.env[name];
    if (value === undefined || value.trim() === "") {
      missing.push(name);
      return "";
    }
    return value.trim();
  };

  const values = Object.fromEntries(REQUIRED.map((k) => [k, read(k)])) as Record<
    (typeof REQUIRED)[number],
    string
  >;

  const wrong: string[] = [];
  if (values.DATABASE_URL && !/^postgres(ql)?:\/\//.test(values.DATABASE_URL)) {
    wrong.push("DATABASE_URL (must be a postgresql:// connection string)");
  }
  if (
    values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_")
  ) {
    wrong.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (must start with pk_)");
  }
  if (values.CLERK_SECRET_KEY && !values.CLERK_SECRET_KEY.startsWith("sk_")) {
    wrong.push("CLERK_SECRET_KEY (must start with sk_)");
  }
  if (values.SESSION_SECRET && values.SESSION_SECRET.length < 16) {
    wrong.push("SESSION_SECRET (must be at least 16 characters)");
  }

  if (missing.length > 0 || wrong.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(", ")}`);
    if (wrong.length > 0) parts.push(`invalid: ${wrong.join(", ")}`);
    throw new ConfigError(
      `TrueSpec configuration error — ${parts.join("; ")}. ` +
        `Set the value in .env.local (see the README) and restart.`,
    );
  }

  cached = {
    databaseUrl: values.DATABASE_URL,
    clerkPublishableKey: values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: values.CLERK_SECRET_KEY,
    sanityProjectId: values.SANITY_PROJECT_ID,
    sanityDataset: values.SANITY_DATASET,
    sanityToken: values.SANITY_TOKEN,
    sessionSecret: values.SESSION_SECRET,
  };
  return cached;
}

export function assertConfig(): void {
  getConfig();
}

export const __resetConfigCacheForTests = () => {
  cached = null;
};
