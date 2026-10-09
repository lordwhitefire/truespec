# Seed Inventory — TrueSpec demo data

All fictional placeholder content for the prototype. **Prices are indicative only** — the client
knows his market instantly and will spot wrong figures. Replace with real numbers from actual
listings before showing him.

## Rules used

- **Mileage is never round.** `84,320`, not `85,000`. Round numbers read as fake.
- **Features are written as a Nigerian seller writes**, not as a spec sheet: "roof rails", "reverse
  camera", "sunroof", not "Sport Package".
- **Names are full** — brand, model, trim, year. Buyers filter on all four.
- **Price is the doorstep price.** What the buyer pays. Never the internal cost.
- Every car carries **5+ Unsplash search terms** matched to its make *and colour*. A photo of a
  black BMW on a Toyota listing destroys the effect faster than any other mistake.

---

## Available (6)

| Field | Car 1 | Car 2 | Car 3 |
|---|---|---|---|
| Brand | Toyota | Honda | Toyota |
| Model | Camry | Accord | Highlander |
| Trim | XLE | EX-L | Limited |
| Year | 2019 | 2018 | 2019 |
| Exterior | Pearl White | Midnight Black | Silver Metallic |
| Interior | Beige leather | Black leather | Grey leather |
| Mileage | 84,320 | 112,750 | 68,410 |
| Price | ₦22,500,000 | ₦19,800,000 | ₦38,000,000 |
| Status | Available | Available | Available |

**Car 1 features:** automatic, 2.0 engine, alloy wheels, reverse camera, lane assist, leather seats,
push-to-start, keyless entry, Bluetooth, sunroof, LED headlights, fog lights, full electric windows,
shade tint

**Car 2 features:** automatic, 2.4 engine, alloy wheels, reverse camera, leather seats, sunroof,
push-to-start, keyless entry, Bluetooth, LED headlights, fog lights, electric windows, shade tint,
steering controls

**Car 3 features:** automatic, 3.5 V6, 4WD, alloy wheels, reverse camera, leather seats, sunroof,
push-to-start, keyless entry, power tailgate, 7 seats, third row, Bluetooth, LED headlights, fog
lights, running boards, shade tint

**Unsplash terms:** `toyota camry white sedan` · `white sedan front view` · `silver suv parked` ·
`car interior beige leather` · `car dashboard steering wheel`

---

| Field | Car 4 | Car 5 | Car 6 |
|---|---|---|---|
| Brand | Lexus | Nissan | Toyota |
| Model | RX 350 | X-Trail | Corolla |
| Trim | F Sport | SL | XLE Premium |
| Year | 2018 | 2019 | 2019 |
| Exterior | Sonic Grey | Gun Metallic | Attitude Black |
| Interior | Black leather | Black leather | Black fabric/leather |
| Mileage | 76,180 | 91,540 | 63,920 |
| Price | ₦31,500,000 | ₦17,900,000 | ₦15,200,000 |
| Status | Available | Available | Available |

**Car 4 features:** automatic, 3.5 V6, AWD, alloy wheels, reverse camera, leather seats, sunroof,
push-to-start, keyless entry, power seats, blind spot monitor, Bluetooth, LED headlights, fog lights,
shade tint, panoramic roof

**Car 5 features:** automatic, 2.5 hybrid, 4WD, alloy wheels, reverse camera, 360 camera, leather
seats, push-to-start, keyless entry, power tailgate, Bluetooth, LED headlights, fog lights, roof
rails, shade tint

**Car 6 features:** automatic, 1.8 engine, alloy wheels, reverse camera, leather seats, push-to-start,
keyless entry, Bluetooth, LED headlights, fog lights, electric windows, shade tint, steering
controls, adaptive cruise

**Unsplash terms:** `grey lexus suv` · `silver suv side view` · `black compact sedan` ·
`modern car interior black` · `car wheel alloy detail`

---

## On Order (4) — each needs an arrival note

| Car | Spec | Mileage | Price | Arrival note |
|---|---|---|---|---|
| Toyota Land Cruiser Prado | TX-L, 2019, White | 58,240 | ₦78,000,000 | *Expected arrival — 3 weeks* |
| Toyota Camry | XSE, 2020, Black | 41,600 | ₦26,500,000 | *Clearing in progress — 10 days* |
| Honda CR-V | EX-L, 2019, Silver | 82,310 | ₦28,400,000 | *Expected arrival — 5 weeks* |
| Toyota Sienna | LE, 2019, Grey | 94,600 | ₦24,000,000 | *Shipping booked — 4 weeks* |

Add features for each — same style as above. **The arrival note is the point of this tab.** It is
what makes "On Order" feel real, and it is the one field a buyer would otherwise have to ask about.

---

## Landed (this year) (4)

| Car | Spec | Mileage | Price |
|---|---|---|---|
| Toyota Camry | XLE, 2017, Silver | 128,400 | ₦16,800,000 |
| Honda Accord | EX, 2017, Black | 139,750 | ₦15,400,000 |
| Toyota Highlander | XLE, 2018, Black | 96,300 | ₦32,000,000 |
| Nissan X-Trail | ST, 2017, White | 118,900 | ₦15,900,000 |

Landed cars are the **oldest stock and the lowest mileage-per-year** — they sat longer. Mileage
above 120k on a 2017 is correct and believable; a 2017 with 40k looks fake.

---

## One "sold" car — do NOT list it publicly

Seed **one car with a sold status** so the tab logic is exercised and the client can see the
accounting hold onto it while the public site drops it.

This is the fix for the brief's missing Sold state. Add it to the admin, keep it out of the public
API, and it still counts in "total landed cost across inventory."

---

## What the client should notice without being told

1. **Prices are plausible for the market.** Wrong ones kill credibility instantly.
2. **Mileage is never round.** This is the detail that separates "a person made this" from a template.
3. **Every photo matches the car and its colour.**
4. **The on-order cars have arrival dates.** The tab has a reason to exist.
5. **One sold car, hidden publicly, still counted internally.** Nobody has to explain it.

---

## Unsplash note

`images.unsplash.com` links work, and resizing is done in the URL:

```
https://images.unsplash.com/photo-XXXXXXXXXX?w=800&q=80
                              ↑ id          ↑ size ↑ quality
```

Useful sizes: `w=400` card thumbnail · `w=800` gallery · `w=1200` detail hero.

**Two practical notes:**

- **Match colour and make.** Search for the car, then check the photo actually shows what the
  listing claims. A grey SUV on a white-sedan listing is the fastest way to lose him.
- **If this ever goes live properly**, Unsplash wants hotlinking done through their CDN with
  attribution, and large products are expected to use their API. Fine for a demo; do it properly
  later. Unsplash also goes down or rate-limits, so **cache the images rather than hotlinking
  them live** — otherwise a demo fails at the worst moment.
