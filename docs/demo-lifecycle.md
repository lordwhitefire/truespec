# Demo identity lifecycle

The public showroom offers an optional demo office — a separate practice space where a demo
account can create cars, enquiries, settings and uploads without touching the main office.

## Lifecycle

- **Demo identities live until the owner removes them.** A demo account is not deleted
  automatically; it remains until the owner explicitly removes it.
- **Daily reset never touches identities.** Demo data and uploads reset daily (around 03:00 UTC),
  but demo identities (accounts) are preserved across resets.
- **Daily reset never touches main rows or main assets.** The reset only affects demo office
  data; the main office, main inventory, main enquiries, main settings and main assets are
  untouched.
- **The public showroom always shows the main inventory**, never the demo inventory.
- **A demo account does not grant access to the main office.** Main access remains
  invitation-only.

## Manual removal

Demo accounts are managed in Clerk. To remove a demo identity:

1. Open the Clerk dashboard.
2. Find the demo user account.
3. Deactivate or delete the account.
4. The demo office data associated with the account is cleared with the demo reset.

## Boundaries

- Demo data and uploads reset daily; the demo office's account record is reset with the demo.
- Main office records are kept as normal business records and are not affected by demo reset.
- No demo data leaks into the public showroom; the public showroom always shows the main inventory.
