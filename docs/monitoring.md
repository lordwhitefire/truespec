# Uptime monitor

The public showroom is monitored with UptimeRobot (free tier). The monitor is live;
this document records its configuration.

## Monitor

- **Monitor ID:** `804452457` — name **TrueSpec showroom**
- **Status:** UP (first check 2026-10-28)
- **URL:** `https://truespec-k4y6.vercel.app/` (public showroom home page)
- **Type:** HTTP(s)
- **Interval:** 5 minutes (UptimeRobot free tier minimum)
- **Alert threshold:** 1 failed check (down immediately)
- **Alert owner:** email contact `victormakuo2002@gmail.com` (active)
- **Expected:** the home page returns `200 OK` and renders the public showroom

## What is NOT monitored

- The office (`/office/*`) — requires a signed-in session, not suitable for anonymous uptime checks.
- Individual car pages — covered indirectly by the home page and inventory.

## Test-alert path

To verify the monitor and alerting without causing an outage:

1. Temporarily point the monitor at a nonexistent path (e.g. `https://truespec-k4y6.vercel.app/__uptime_robot_check__`) and confirm an alert fires.
2. Point it back to `https://truespec-k4y6.vercel.app/` and confirm it recovers.
3. The healthy site is not noisy: with the monitor on the home page there are no alerts while the site is up.

## Notes

- This is an external, anonymous check — no session, no database write, no secrets.
- The monitor URL is a public route that returns `200` when the showroom is healthy.
- If the monitor is ever deleted, recreate it from this document; runtime checklist F1
  records the monitor as created on 2026-10-28.
