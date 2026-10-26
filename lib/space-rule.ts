/**
 * The one space rule, kept pure so it is testable without Clerk or a request.
 *
 * Main is the owner's office and the public showroom. Demo is the practice copy.
 * The only main grant is the exact string `"main"` at
 * `publicMetadata.truespec_space`. Everything else — missing, malformed, unreadable,
 * a different case, a different type — is demo. That direction is deliberate: a
 * broken or absent grant must never open main.
 */
export type Space = "main" | "demo";

/** The minimal shape of a signed-in Clerk user this rule needs. */
export type SpaceUser = { publicMetadata?: unknown } | null | undefined;

export function spaceFromMetadata(metadata: unknown): Space {
  if (typeof metadata !== "object" || metadata === null) return "demo";

  const value = (metadata as Record<string, unknown>).truespec_space;
  return value === "main" ? "main" : "demo";
}

/**
 * The resolver's decision, separated from the Clerk call so it can be tested.
 *
 * No signed-in user is a refusal, never main. The caller (`lib/space.ts`) does not
 * catch a Clerk failure either, so an unreachable provider fails the request rather
 * than falling back.
 */
export function spaceFromUser(user: SpaceUser): Space {
  if (!user) {
    throw new Error("No signed-in user; the office space cannot be resolved.");
  }

  return spaceFromMetadata(user.publicMetadata);
}
