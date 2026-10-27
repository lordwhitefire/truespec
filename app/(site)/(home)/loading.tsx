import { StoreWaking } from '@/components/store-waking';

// The showroom's slow read: the waking line, from the first byte (design D18). It sits on this
// page's own segment — never above the car route, whose real 404 would be lost to the flush
// (plan Task 8a).
export default function Loading() {
  return <StoreWaking />;
}
