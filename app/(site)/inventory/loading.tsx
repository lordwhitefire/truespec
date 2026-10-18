import { StoreWaking } from "@/components/store-waking";

// The inventory's slow read: the waking line, from the first byte (design D18).
export default function Loading() {
  return <StoreWaking />;
}
