# Rate limits

The public showroom accepts unauthenticated writes (Clerk sign-in, WhatsApp tap, demo sign-up,
enquiry forms). Each unauthenticated write has an enforced limit or a dated owner acceptance with a
reason.

## Limits

| Surface       | Limit                    | Enforced?        | Notes                                                                                                    |
| ------------- | ------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Clerk sign-in | Clerk-managed rate limit | Yes (Clerk)      | Clerk enforces sign-in/sign-up rate limiting; see the Clerk dashboard.                                   |
| WhatsApp tap  | 30 requests / 60 s / IP  | Yes (Vercel WAF) | Configured as a Vercel WAF rule at the edge. The local build has no in-app limiter; F4 is not exercised. |
| Demo sign-up  | Clerk-managed rate limit | Yes (Clerk)      | Sign-up uses Clerk's component, so the provider limit applies. F5 is not exercised.                      |

There is no public enquiry form: buying questions go through WhatsApp. Enquiries are created in the
office by a signed-in operator, not by an unauthenticated visitor.

## Accepted risks (dated owner acceptance)

None currently. Any unauthenticated write without an enforced limit requires a dated owner
acceptance with a reason, recorded here.

## Notes

- Rate limits protect the office and demo office from abuse; they are not access control — the
  office still enforces its own session and the demo is a separate practice space.
- Rate-limit thresholds are not secrets and may be adjusted by the owner as traffic warrants.
