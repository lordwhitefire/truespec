# UI recommendation — my decision, in plain words

**Asked by:** the Product Management agent
**Date:** 2026-10-04
**Question:** Should the product model adopt the UI recommendation as written, or change parts of it?

---

## The short answer

**Do not accept it as one lump.** The question was "yes or no to everything," and that is not a fair
question. It mixes four different kinds of decision together:

1. Things a **standard** settles. These are not really decisions.
2. Things **several design systems agree** on. These are strong advice.
3. Things that are **one team's taste**, dressed up as a rule.
4. Things that are **business decisions**, not design decisions at all.

Answering "yes" to all four at once means the owner is asked to sign off on things he does not need
to sign off on, and things he should not be asked about at all.

So I split it:

| Part | My call | Whose call it is |
|---|---|---|
| Accessibility (contrast, tap size, colour-blind rules, zoom) | **Settled. Adopt.** | Nobody's — a standard settles it |
| One token set, one spacing scale, one radius, tablet gets its own layout | **Adopt as strong advice** | Safe to build on |
| "No colour per car state" | **Split in two — see below** | Part mine, part his |
| Price abbreviation, mileage unit, "no charts yet", "three tabs no search" | **Take back out of this document** | Belong to the business-logic conversation he saved for last |
| Typeface and text weight | **Send back to him** | His — see below |

---

## His question (a): is Polaris the right rulebook for the showroom?

**Partly. Use it for the office. Do not use it as the rulebook for the showroom.**

Polaris is Shopify's **admin** system. It was never built to design a public shopping page. So
saying "Polaris says so" about the showroom is stretching it.

There is a bigger hole. Every system we looked at — Polaris, Carbon, Material, Tailwind — is an
**admin or app** system. Not one of them is a **marketing page**, which is what the showroom is.
The showroom's whole job is to persuade a stranger to send a WhatsApp message. We never looked at
one system built for that job.

**What still stands.** Three systems arrived at "one set of basic colours, then named colours on
top" without ever speaking to each other. Three systems use a 4px spacing base. Those two things are
real, and they hold for the showroom as well — because they are about how code is organised, not
about what a shopping page looks like.

**What does not stand.** The typeface, the "ten shades per colour", the four-colour status set, the
screen breakpoints — those are **Shopify's choices, not a standard**. They are fine choices. They are
one team's opinion, and they should be written down as one team's opinion.

Your own document already draws this line in its sources table. The summary you sent the owner did
not. He read the summary.

---

## His question (b): should car states get no colour at all?

**The office: yes, he is right. The showroom: he is right by accident, and for the wrong reason.**

**The office — correct.** The owner can invent as many car states as he likes, forever. "Held for
payment", "at port", whatever he types. Any fixed set of colours runs out. So no colour per state.

**The showroom — his reason is wrong.** He said colour would leak his private labels to buyers. It
would not. Buyers never see his private labels — they only ever see three fixed names: Available,
On Order, Landed. So there is nothing there to leak. That reason answers an office question, not a
showroom question.

**And one thing he got wrong in the rules themselves.** WCAG says colour must not be the **only**
way you show something. It does not say "never use colour". Your document turned "colour cannot be
the only signal" into "no colour at all". That is stricter than the law. It happens to land in the
right place here, but for the wrong reason, and one day it will be quoted as something WCAG says.
It is not.

**And the worry that prompted his question does not apply.** He asked: what if a grid of cards shows
Available, On Order and Landed and a buyer cannot tell them apart at a glance? That grid does not
exist. **Landed sits inside Available** — it was already decided. Inside a tab there are only two
kinds of card: a new arrival, or not. A label and its position say which. There is no three-way
glance to solve.

**One thing to fix in the build.** Answer 39 lists "status" on the showroom card. That word has to
mean the **group** name (Available / On Order / Landed), never the owner's own state name. As
written, it leaves the door open to the one thing the product model forbids.

---

## His question (c): was refusing to set the type scale a cop-out?

**No for the type scale. Yes for the component list. And the real answer is neither — draw a screen.**

**Type scale and shadows — his call was right.** Picking a type scale before you have laid anything
out really does give you a scale that fits nothing. That is a good reason, not an excuse. Keep it.

**The component list — that one was a cop-out.** He says he did not decide the full component list.
But answers 60 to 71 already decided it: four button styles, two sizes, how fields look, where the
required marker goes, where badges appear, table rules, paging, pop-up size. That *is* a component
list. He decided it in the answers and then said he hadn't. Pick one.

**What is actually missing.** Nothing about this has ever been drawn. A hundred and twenty written
answers have never met a real layout. The book we hold says work should be **rough, solved and
bounded** — and this is not solved, because not one screen exists to test it against.

**So the next thing to do is simple: draw one screen.** The showroom card grid, on a phone. Let the
type scale, the spacing and the shadows fall out of it. That one screen settles more open questions
than any amount of further writing.

Then draw the office inventory list on a laptop — because your own earlier document says do not cut
corners on the screens the client will actually use, and those are the admin and the gallery.

And close the component list in the same pass, so it is not left open a second time.

---

## Three things nobody flagged, that I am adding

### 1. He set a rule about type. The document broke it and did not say so.

He said: **one typeface, one weight, two sizes.**

The document recommends: **two typefaces** (Inter and Oswald), a **second weight** for money, and a
**whole scale** of sizes instead of two.

Here is what makes this a real problem rather than a matter of taste. In the same document, the
change to screen sizes **is** flagged — *"your 560 / 820 / 1100 is close enough that switching is
cheap."* And whether the showroom goes dark is **handed to him**. Two changes surfaced, one did not.

And you already have the rule written down, from the earlier product design: *"This is the
recommendation overriding the brief, deliberately. If you disagree, that is a legitimate call to
make against my advice."*

Use it here too. **The typeface and the weight are his decision, not a standard's.** Inter is
Shopify's taste. He liked what he already had. He should be told it is being changed and get to
say no.

### 2. Rule 1 deletes the thing rule 2 exists to fix.

Rule 1: go all dark, everywhere. Rule 2: add a second, darker gold `#8a6d1f`, because the gold is
unreadable on white.

If everything is dark, there are no white panels. **So the second gold is never used.**

And answer 88 talks about darkening gold for light panels, while answer 7 says there is no light
mode at all. Both cannot be true.

Fix this before anyone builds. Either everything is dark and the second gold comes out, or name the
one light surface that survives. Do not hand two live answers to a builder.

### 3. Two answers contradict each other, and the summary contradicts both.

- Answer 34: show the **full price**. *"Abbreviating the price… is the wrong place to save four
  characters."*
- Answer 82: **abbreviate on showroom cards.**

Those two can be reconciled — page versus card, and the office/showroom split is the right way to
think about it. But as written they read as opposites.

Worse: the summary sent to the owner says you recommended **against** abbreviating prices on the
showroom. That is not what either answer says. The owner read the summary, not the document. Fix
the summary first.

---

## What I need from you before you act

**One thing, and it can change a decision.** I have his "one typeface, one weight, two sizes" only
as your summary of it. I need **his own words from the original brief**, the visual-direction part.

If he actually said something looser, then the document is not breaking his rule and there is nothing
to send back to him. If he said it exactly like that, it is a broken rule and he must be asked.

**Everything else I did not have, and did not guess at:**

- No deadline or budget anywhere in the package. So there is no fixed point for "good enough."
- No marketing-page design system in the set. That hole in (a) cannot be closed from what I was
  given.
- I checked no WCAG clause or Polaris value against the original documents. I only ruled on what
  your package already stated, plus the wording of the colour rule, which your package states
  correctly.
- Nothing has been drawn, so every opinion about spacing and "at a glance" is untested. That is
  your point (c), and I agree with it.

---

## Where this came from

Read from the workspace's own product-management model —
`.mental-model/product-management/` — the mental model, decision model, judgment criteria model and
cue/strategy model, together with the settled product model in
`product-management/product-overview.md` and `truespec-product-design.md`.

The acting agent's own copy of that model, at
`/home/lordwhitefire/agentic-frameworks/product-management/mental-models/product-manager/`, is
**identical, file for file, in all eleven files.** So there was no clash to settle — one model, not
two. Nothing needed escalating to you on that account.

Nothing outside this folder was written.