import { StoreWaking } from "@/components/store-waking";

/**
 * The store-wait for everything below the app root (design D18).
 *
 * It sits here, at the root, because `loading.tsx` wraps *nested* layouts but never the layout in its
 * own segment (Next's documented behaviour). The public area's slow read is in `app/(site)/layout.tsx`
 * — `getSetting()` / `getPublicCars()` — so a boundary placed beside that layout would cover nothing;
 * this one, one segment up, is what wraps it. The office has its own, closer, in `app/office/`.
 */
export default function Loading() {
  return <StoreWaking />;
}
