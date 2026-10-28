# 05 — Send checklist

Run this before the email goes. Each line is a yes/no. Any "no" is a reason to wait, not to hope.

---

## Blockers — must be resolved before sending

- [ ] **The invitation is sent before the PDF.** The client gives you his email; you invite him in
  Clerk; he accepts and signs in with Google. The guide describes that flow and prints no
  credentials — so the order matters. If the PDF arrives before the invitation, page 2 sends him
  looking for an email that does not exist.

- [ ] **The expired test user is dealt with.** `test@gmail.com` is a real account you cannot receive
  mail for. Revoke or delete it in Clerk so it is not a dormant way in. Nothing in the guide refers
  to it now.

- [ ] **Confirm the client's address before inviting.** One typo and the invitation goes somewhere
  he cannot reach, which looks exactly like the problem we just removed.

- [ ] **Which database the Vercel deployment points at is confirmed.** If it is still the throwaway
      Neon branch, the client can enter real stock into a store that will be discarded. The guide
      calls the visible cars "sample cars"; if the branch is temporary, add one line to the note:
      *"Treat it as a practice copy until I switch it to your real inventory."*

- [ ] **The WhatsApp number in Settings is deliberately still the placeholder.** If you know his real
      number, set it before sending and remove step 1 of page 3 — but only if you are certain it is his.
      Otherwise leave it, because the guide makes replacing it the first task.

## The guide itself

- [ ] PDF opens on a phone, and `₦` renders correctly (not a box or a question mark).
- [ ] Page count and size are sane for email: 18 pages, ~335 KB.
- [ ] Page 2 tells him to open the invitation — and the invitation is actually in his inbox before
      the PDF lands.
- [ ] Every screen described exists in the live build at `truespec-k4y6.vercel.app`. Spot-check:
      Dashboard, Inventory, Add a car, Drafts, Enquiries, Activity log, Settings.
- [ ] Nothing in the guide blames the client, mentions the overrun, or apologises. The guide is a
      manual; the note carries the accountability.
- [ ] "Save as a enquiry" is quoted exactly as the button reads. If you fix that typo in the product
      before sending, fix it in the guide too — otherwise he will look for a label that is not there.

## The note

- [ ] `[Name]` and `[Your name]` are filled in.
- [ ] The apology is still one sentence. It has not grown into a paragraph.
- [ ] No sentence implies the brief caused the delay.
- [ ] The note and the PDF go in the same email. Not the note first and the PDF later, and not the
      other way round.

## Credentials hygiene

- [ ] No password is printed anywhere. He signs in with Google; you never see a credential.
- [ ] `test@gmail.com` is revoked in Clerk, not merely abandoned.

## Known, and deliberately not mentioned to the client

- `Save as a enquiry` is a grammar slip in the UI.
- `/office/settings` failed to load once on first visit and succeeded on retry.
- The sidebar's "Add / edit car" opens the add form; a typed `/office/car` redirects to Inventory.
- There is no "Office" link on the public site. This is intentional; the guide tells him to bookmark it.
