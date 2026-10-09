# System Model — checklist

**How the system behaves.** Layer three, sitting on the product model and the data model.

The product model says what should happen. The data model says what is kept. This says what
actually happens — the request paths, the guarantees, the boundaries, and the edge cases, in the
order they have to be settled.

**Status:** every item below is unworked, except the eight marked **[settled]**, which were answered
in an earlier layer or already closed, and are not reopened here.

**Stage:** planning closed 2026-10-06. The answers to the unworked items get written in the
**system model implementation plan**, derived from the screens once they are wired. Items J86, J90
and K97–K99 were ruled on earlier but never written here — they are tracked as C1–C2 in
`planning-close.md`. See that file for everything still open.

**Two of these reach back upward.** Item B19 honours a promise the product model makes. Section M
is a policy decision, not an implementation one. Neither belongs to this layer to invent.

---

## A. What comes in

1. Every entry point — the full list of URLs and actions the outside world can reach
2. Which requests are public and which are office
3. The check on each door — what stops an office page loading without a session
4. Data arriving from a browser form — which fields, and which are trusted
5. Data arriving from a URL — refs, filters, page numbers
6. A file arriving — the enquiry PDF
7. A session cookie arriving — what it proves, and what it does not
8. **[settled] CSRF — a valid session on a request the owner never initiated.** A cookie proves *who is asking*, not that they *meant to*. Answer: `SameSite=Lax` or `Strict` on the session cookie; every change a **POST**, never a link; check the `Origin` header; a token only as a layer on top. *Next.js Server Actions include the origin check automatically — **Route Handlers do not**, so this depends on which one each write uses.* Note `SameSite=Lax` still sends the cookie on a top-level GET, which is why "no state change on GET" is the actual requirement, not tidiness.
9. Which actions are reachable by a link alone, with no confirmation
10. What a person sees when they send something the system never expected

## B. Reading — how a page gets its data

11. The showroom list — which cars qualify to appear at all
12. The order they appear in
13. Car detail — the exact list of fields allowed to leave the server
14. The rule that decides that list — one place, one function
15. Showroom counts — carrying the rule **Available = Available group + Landed this year group**
16. Home page counts — the same rule, never counted separately
17. Office counts — the same rule again
18. Why those numbers can never disagree — one rule, applied at every read point
19. **How fast a change reaches buyers** — the product model promises a new car appears immediately
20. **What could show a buyer stale data** — a cached page, a slow CDN, a browser holding an old copy
21. **A visitor opening a link to a deleted car**
22. **A visitor opening a shared link to a sold car**
23. **The page payload, not just the visible page** — anything sent to the browser that is never drawn
24. **Error messages that repeat back what was submitted** — a leak that hides in plain sight

## C. Writing — how data changes

25. Adding a car
26. Editing a car
27. Save order — which field wins when two are changed at once
28. Changing a car's state
29. Marking a car sold
30. Unmarking sold — **the sale record must be reversed or voided**, or projected and real profit stay wrong
31. Deleting a car
32. Restoring a deleted car
33. The Undo window
34. Adding, changing and removing cost lines
35. Changing settings
36. **Settings validation** — a wrong WhatsApp number makes the main button dead
37. **The PDF upload as a process** — what happens to the parsed rows while he reviews them
38. **What the PDF rejects, and what he is told**
39. **What happens to the uploaded file afterward**
40. **Adding, renaming and deleting car states** — and what happens to cars sitting in a removed state
    - **Customer states follow identical rules.** A separate editable list of their own — New, Talking, Negotiating, Sold, Lost. Add, rename, reorder, and block deletion while any customer sits in it.
    - The two lists never touch each other. Marking a customer Sold does not move the car.
41. **Reference codes** — assigned on creation, and whether they can ever be reused or edited

## D. Money

42. Currency on every cost — and where it is chosen
43. The rate on every cost — and where it comes from
44. Rate carrying forward, and staying editable afterwards
45. **[settled]** Kobo and cents as the only stored unit — *the data model*
46. **[settled]** Naira at the edges only, never stored — *the data model*
47. **[settled]** The three totals — projected profit, real profit, money tied up — *product model*
48. **[settled]** Which cars count toward each total — **profit counts only cars with all six costs entered**; a sold car also needs a recorded sale price. **Money tied up counts whatever costs are entered**, because that money is spent whether or not the paperwork is finished. Different quantities, so different rules. *Product model*
49. **[settled]** The line that explains an exclusion — the dashboard states how many cars were left out and why — *product model*
50. Zero against not-entered
51. A cost with an amount but no rate
52. Negative profit — a car that lost money
53. Rounding — and the single place it happens

## E. Two people, two tabs

54. The same car edited in two places
55. The same form submitted twice
56. A state changed while an older page is still open
57. Who wins, and how the other person finds out

## F. When things break

58. Database unreachable
59. An action failing halfway — sale saved, car not moved
60. Image missing or broken at the source
61. A value in a field the app did not expect
62. A session expiring mid-action
63. What the person sees, case by case
64. What is retried, and what is not
65. **The database lost or corrupted** — who restores it, and from what
66. **How often a backup is taken, and how we know one actually worked**

## G. The services and the seams

67. Neon (data) and Clerk (auth, sessions) — which does what
68. Sanity — images and enquiry PDFs: what it does
69. A photo deleted at Sanity but still referenced in the database
70. A photo referenced before processing finished
71. Where the two services disagree, and which one wins
72. A car whose image store is unreachable

## H. Images

73. The upload path — device to storage
74. Derivatives — what is generated, and when
75. What is served where
76. The cover photo rule
77. Storage cost over time
78. What happens when image storage costs more than expected

## I. Time

79. One timezone for everything
80. Where dates are stored, and in what form
81. A rate's date against the cost's date
82. **[settled]** What "Landed this year" means to the database — **no date logic of any kind; only a group.** The state belongs to a group, and that group membership is the whole of what the database knows about it. *Product model*
83. Everything that depends on today's date

## J. Access and sessions

84. First run — creating the one admin account
85. **[settled]** No signup, ever — *the product model*
86. Session length, and what ends it
87. Password storage
88. A shared or public computer
89. Losing the password
90. **Login attempt limits** — the brief requires them
91. **First run and seed data together** — the product promises demo data is already loaded
92. **The owner's number** — real for testing, swapped before the client sees it, never in a seed file

## K. WhatsApp

93. The tap — what is recorded
94. The number used, and where it comes from
95. The message — fixed wording or configurable
96. What must never appear in a message
97. **Bots and floods** — it is an open write anyone can trigger
98. **What a flood looks like, and what it costs him**
99. **What the tap rate is, and what happens when it is passed**

## L. Build order

**Two orders, deliberately opposite.** One is the order things are *settled*, the other the order they are *built*. They are not the same, and the difference is not a detail.

**Planning — business logic → functionality → UX → UI.** The rules first, because everything after answers to them. The UI is planned last, since a design written before the rules exist has to be bent to fit them afterwards.

**Implementation — UI → business logic → functionality → UX.** The surfaces go up first, then the rules, then what the product lets people do, and the behavioural layer last — planned early, landed last, so that no feature moving underneath it can re-break an experience already built on top.

What each stage means here:

1. **UI** — pages and surfaces exist, both modes, looking right.
2. **Business logic** — schema, money, counting, state machines, visibility, reference codes.
3. **Functionality** — auth, CRUD, gallery, images, WhatsApp, enquiries, dashboard, settings.
4. **UX** — dialogs, focus, toasts, undo, offline handling, failure wording.

*Change, 2026-10-06: this section gave no order, only the checks below. The two orders above were added as the owner ruled them.*

**The questions the order raises:**

100. What has to exist before anything else
101. Which piece unblocks the most
102. What can be built without the database
103. What can only be tested with real data
104. **The pre-handover leak check** — every public page, against the real live address
105. **The settings check before go-live** — the main button actually works
106. **Deployment** — missing keys, secrets, and what happens when one is absent
107. **Test and live kept apart** — and never checking localhost and calling it verified
108. **Monitoring** — how something breaking is noticed before the client notices

## M. Personal data and ownership

**This section is the owner's policy, not an engineering decision.** What follows is the shape the
law requires. The retention period itself is the owner's to set.

**Settled — what the Nigeria Data Protection Act 2023 actually says:**

109. **No fixed period.** The Act sets no number of years. Personal data is kept only as long as the purpose it was collected for actually needs.
110. **Every retention period needs a justification** the owner could state out loud if asked.
111. **Time limits must exist** for erasing, or periodically reviewing, the data.
112. **A privacy notice on the site** — what is collected, why, and how long it is kept. It belongs on the page carrying the WhatsApp button, before the tap.
113. **Cross-border storage.** Neon, Clerk, Sanity and Vercel all store outside Nigeria, so customer names and numbers sit abroad, and the Act has its own conditions on transferring data out. This is where **region choice for hosting** stops being an infrastructure detail.
114. **Registration threshold — unverified, confirm before repeating it.** Appears to attach to *data controllers of major importance*, which is a category test about the kind and scale of processing — not a simple headcount. A single-showroom business is likely well under it. Do not quote a figure to the client until this is checked against the Act.

**Open — the owner's decisions:**

115. **How long customer names and numbers are kept.** *To be set.* Options put forward as starting points, none adopted: enquiries marked Lost or Not serious — delete or anonymise after ~12 months; open enquiries — review every 12 months; customers who bought — keep as long as accounting or tax rules require.
116. **Whether the site tells visitors the retention period**, or only serves the privacy notice.
117. Who inside the app can see customer details.
118. Deleting a customer — what is left behind afterwards.
119. **Data export** — whether the owner can get his own data out, and in what form.
120. What the owner loses if he leaves with the system.

---

## Notes on quoting the law to the client

- **No section numbers.** State the rule, cite nothing, unless the citation has been opened and
  checked. A wrong section number in a client document is worse than no number.
- **No unverified figures.** The retention thresholds and any registration number are unconfirmed.
  Hedged or dropped — a client will quote them back at their own adviser.
- **The record-keeping period for tax purposes is an accountant's question**, not this document's.
- **Carried as general information, not legal advice**, and confirmed with the client's own lawyer
  or a licensed data protection compliance organisation.

---

**120 items.** We work them in order and fill each one in.

**Eight are answered already** — 8, 30, 45, 46, 47, 48, 49, 82, 85 — and point at the layer that
settled them.

*Item 30 is narrowed rather than closed: the requirement is now explicit — the sale record must be
reversed or voided — but the mechanism is still open.*

**Two reach back upward** — 19 honours a product promise, and all of M is a policy decision for the
owner rather than something this layer can decide.