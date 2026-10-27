// Playwright smoke test configuration (documentation).
//
// The smoke test (e2e/smoke.spec.ts) runs against the local production build on :3210.
// It connects to the existing Chrome on CDP :9222 via playwright-core — it never launches
// a browser and never opens a tab. Run with:  npm run smoke-test
//
// baseURL: http://127.0.0.1:3210
// Required before running: PORT=3210 npm start  (local production build)
export const smokeTestConfig = {
  name: "smoke",
  baseURL: "http://127.0.0.1:3210",
  cdpUrl: "http://127.0.0.1:9222",
  pages: ["/", "/inventory", "/car/TS-1001", "/office/sign-in"],
  checks: [
    "home loads with main heading",
    "inventory loads with main heading",
    "car page loads with main heading",
    "anonymous office request sent to sign-in",
    "no office data renders anonymously",
  ],
};
