import { StoreWaking } from "@/components/store-waking";

// The office's slow read, from the first byte (design D18). It sits on this page's own segment —
// never above `car/[ref]` or the unknown-address catch-all, whose real statuses a boundary above
// them would swallow (Task 9, mirroring Task 8a's move on the site).
export default function Loading() {
  return <StoreWaking />;
}
