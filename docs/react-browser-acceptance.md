# React browser acceptance

1. The credential-free React regression matrix runs the six existing suites plus the Meta dialog regression in Chromium, Firefox and WebKit: **21 required runs**. A missing engine, timeout, failing assertion or missing/mismatched browser evidence fails acceptance. There is no fallback to another engine.

1.1 Install the browser versions matched to the repository's locked Playwright dependency:

```sh
node node_modules/playwright/cli.js install chromium firefox webkit
```

1.2 First build the configuration-required application without Clerk credentials using `npm test` (which also performs both production builds). Then run:

```sh
npm run e2e:react-browser-matrix
```

1.3 For a single-engine diagnostic run, set `CONNECT_E2E_BROWSER=firefox` or `CONNECT_E2E_BROWSER=webkit`. Each individual `e2e:*` command also accepts that variable and otherwise retains Chromium as its default. A narrowed run is recorded as seven runs, never as a full matrix.

2. Results are written to `output/playwright/react-browser-matrix.json`: engine and actual browser version, host, Node version, process exit status and full per-suite diagnostics. The file is replaced by the next run; preserve a copy with the source revision when preparing a release.

| Suite | What it proves within this scope |
| --- | --- |
| Workspace navigation | Built application's configuration-required shell; Hebrew/English/Arabic; mobile-width keyboard focus, menu close, desktop resize and 320px AI cards/controls without overflow or clipping |
| AI editor | Real React editor with controlled actions; load/save/publish/reload locking |
| Workspace language | Actual language bridge, cleanup/remount, without Clerk accounts |
| Team management | Permission/ownership controls and concurrency with controlled action results |
| Business profile | Versioned save, pending edits, remount and conflict with controlled action results |
| Contact permissions | Three languages, eight membership/selection states, role-loss behavior |
| Meta dialog | Actual dialog; keyboard traversal through native disclosure summaries to footer actions and focus restoration |

3. All page HTTP requests are restricted to the **exact owned loopback origin**, including its port. Fixtures remain local and the six Vite component harnesses disable environment-file loading. The suites reject ambient Clerk credentials. No real account, invitation, WhatsApp message or product data is changed.

3.1 Component harnesses isolate controlled server-action boundaries. Their acceptance does not prove authentication or real service integration. Most do not load the complete application's CSS and therefore are not full visual layout acceptance.

3.2 Playwright's WebKit is browser-engine coverage, not acceptance of Apple's installed Safari or a physical iPhone. This matrix does not claim physical Android/iOS testing, touch behavior, installation, full feature coverage or all operating systems. Workspace navigation and Meta dialog use a mobile-width viewport and keyboard input; navigation also resizes to desktop.

3.3 The bot graph's separate browser harness and the account-bound invitation workflow are outside these seven suites. Their existing scope and activation requirements remain unchanged.

4. CI installs all three locked browser engines with their Linux dependencies and runs the same 21-case matrix after the complete tests and builds. Local macOS results and future Linux CI results must be identified separately; neither implies physical-device acceptance.

4.1 CI logs one compact `CONNECT_BROWSER_RESULT` record per suite with engine, browser version and status. The detailed local report is not uploaded by this workflow.
