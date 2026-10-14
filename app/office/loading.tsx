import { StoreWaking } from "@/components/store-waking";

/**
 * The store-wait for the office (design D18).
 *
 * One segment above `(shell)`, deliberately: the office shell's layout reads the store to check the
 * session (`requireOfficeSession()`), and a `loading.tsx` beside a layout never covers that layout's
 * own read. This boundary is what the owner sees while the session check waits on a cold store.
 */
export default function Loading() {
  return <StoreWaking />;
}
