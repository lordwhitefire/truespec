# 02 — SYS-002, SYS-005, and how the actor is shown

**Checked:** 2026-10-20, current working tree (code reading only).
**Tracker item:** 3.

## SYS-002 — the office enrolls whoever the provider signs in

**The enrollment.** On the first office request that carries a provider session, `lib/session.ts:155-164`
takes the provider's primary email and runs:

```sql
INSERT INTO office_user (email) VALUES ($1)
ON CONFLICT (email) DO UPDATE SET updated_at = $2
RETURNING id
```

Then it creates the office session row for that user. There is **no allow-list**, no invitation
check, and no second condition.

**The table allows many owners.** `office_user` has `email UNIQUE` but no single-row constraint
(`migrations/0001_people.sql:4-10`; `0010_identity.sql:17` dropped the password column when Clerk
took the door). Today it holds one row because one person signs in — not because the schema
forbids a second.

**The door relies on the provider being invite-only.** The sign-in page says so in its own comment:
*"the provider is in invite-only mode, so there is no public sign-up"*
(`app/office/sign-in/[[...sign-in]]/page.tsx:18-21`). That is a Clerk dashboard setting, not code.
It belongs in the deployment check, beside the 10-attempts / 30-minutes lockout.

**What is settled.** The owner accepted the demo's single-user model (2026-10-20): no roles, no
permission system; the compensating control is the **activity log naming the actor**. So this layer
does not add an allow-list. It does two things: makes the actor visible on touch (Q9), and records
the provider settings the demo depends on (invite-only, lockout) as deployment checks.

## SYS-005 — no in-page expiry signal

**The limits.** A session lives 7 days in total and dies after 12 idle hours; `last_seen_at` is
refreshed at most every 5 minutes (`lib/session-rules.ts:14-21`).

**What happens at expiry.** `requireOfficeSession` redirects: an ended session goes to the sign-out
route, any other non-active state goes to sign-in (`lib/session.ts:200-204`). The office screen
never says the session is about to end. A search for expiry/idle wording under `app/office` finds
only the delete-toast timer and the shell's *"Signed in as {email}"* (`app/office/(shell)/layout.tsx:54`).

**What is protected.** The device draft keeps the car form and the three settings cards
(`lib/device-draft.ts:9-11`). **Enquiries store nothing** — an expiry in the middle of an enquiry
edit loses the typing.

**Options:**

- **(a) Accept.** Twelve idle hours is long, the demo has one user, and the long forms (car,
  settings) already keep drafts. The expiry redirect is clean, and the enquiry form is short.
- **(b) Warn.** A small notice when the idle window is nearly over (or a "save before you leave"
  guard). It needs a client-side clock and a rule for what "nearly" means; for a demo it adds
  machinery the risk does not justify.

**Leaning:** (a) accept, with the testing pass checking that expiry redirects cleanly and that the
car draft survives. **Open:** Q2.

## The actor on touch (Q9)

Already verified in `findings/01` §3: the feed carries the operator's email
(`lib/office.ts:441-448`), but the row renders only the **initial**, with the email in a `title`
attribute — i.e. on hover (`lib/activity-feed.ts:96-99`,
`app/office/(shell)/activity/activity-client.tsx:134`; the dashboard uses the same helper,
`app/office/(shell)/(dashboard)/page.tsx:140`). A touch screen never shows it.

**Proposal:** keep the initial avatar and print the email (or its local part) visibly in the row —
one short label is enough. The shell already shows *"Signed in as {email}"*, so the row would match
what the owner sees at the top of the screen. **Open:** Q9.
