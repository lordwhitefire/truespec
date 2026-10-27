# Uptime monitor

The public showroom is monitored with UptimeRobot (free tier). The owner creates the
UptimeRobot account and the monitor; this document records what to configure.

## Monitor

- **URL:** `https://truespec-k4y6.vercel.app/` (public showroom home page)
- **Type:** HTTP(s)
- **Interval:** 5 minutes (UptimeRobot free tier minimum)
- **Alert threshold:** 1 failed check (down immediately)
- **Alert owner:** the site owner (email used for the UptimeRobot account)
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
- If the monitor cannot be created (owner has not set up UptimeRobot), runtime checklist F1 is
  `NOT RUN` with this documented setup.
