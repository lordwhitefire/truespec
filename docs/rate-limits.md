# Rate limits

The public showroom accepts unauthenticated writes (Clerk sign-in, WhatsApp tap, demo sign-up,
enquiry forms). Each unauthenticated write has an enforced limit or a dated owner acceptance with a
reason.

## Limits

| Surface | Limit | Enforced? | Notes |
|---------|-------|-----------|-------|
| Clerk sign-in | Clerk-managed rate limit | Yes (Clerk) | Clerk enforces sign-in/sign-up rate limiting; see Clerk dashboard. |
| WhatsApp tap | Per-IP, per-minute cap | Yes | The tap gate rate-limits taps per IP so a single visitor cannot flood the office. |
| Demo sign-up | Per-IP, per-hour cap | Yes | Demo accounts are rate-limited to prevent abuse of the demo office. |
| Public form (enquiry) | Per-IP, per-minute cap | Yes | Enquiry submissions are rate-limited per IP. |

## Accepted risks (dated owner acceptance)

None currently. Any unauthenticated write without an enforced limit requires a dated owner
acceptance with a reason, recorded here.

## Notes

- Rate limits protect the office and demo office from abuse; they are not access control — the
  office still enforces its own session and the demo is a separate practice space.
- Rate-limit thresholds are not secrets and may be adjusted by the owner as traffic warrants.
