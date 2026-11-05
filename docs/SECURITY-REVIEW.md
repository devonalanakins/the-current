# Integrity and security review — synthetic candidate

## Claim and decision

Four working role experiences and a persistent, version-bound synthetic lifecycle; **not a production security certification or client acceptance**. The author performed a separate falsification/review pass using backend and real-browser behavior. There was no independent human reviewer or separate-agent security sign-off. CI provides a separate execution environment, not independent authorship or a specialist signature. Release decision remains **NO-GO for client/public production**.

## Actual checks

The Node suite exercises the full lifecycle, direct HTTP boundaries, foreign organization data, guessed identifiers, immutable approved versions, distinct approver authority, state/revision checks, duplicate/concurrent releases, role/token/session revocation/expiry, CSRF, request size/type, XSS escaping, printable projections, timer non-disclosure, correction history and live SQLite WAL backup/restore. The tests are grouped by scenario; the count of groups is not the count of individual assertions. See test source and exact-candidate CI for results, not this prose as proof.

The browser suite uses fresh isolated identities and real native forms from producer draft through publication, limited invitation, runner pause/reload/reveal/completion, separate evidence approval and release, and investigator print view. It captures six major views at seven widths (320/390/430/768/1024/1440/1920), checks page overflow, automated Axe WCAG 2/2.1/2.2 A/AA tags, and page exceptions. The absent-media fallback, keyboard focus, ordinary participant versus safe-display credential, and sealed investigator desk are exercised. It does not prove full WCAG conformance or real-user comprehension.

## Critical negative cases

| Required attack                            | Backend evidence                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Participant requests facilitator script    | `/run`, `/api/briefings` and production preview denied over HTTP                                                    |
| Guess another invitation                   | Random credential rejected; no invitation detail returned                                                           |
| Revoked invitation accesses media          | Future direct image and conditional-cache requests denied; `no-store`, no ETag/304                                  |
| Investigator retrieves unreleased evidence | Empty evidence projection; direct clue/export/preview denied                                                        |
| Other campaign evidence                    | Foreign campaign API/media/export denied with live scoped grants                                                    |
| Producer bypasses approval                 | Approval/publication authority denied; cannot start/reveal/release                                                  |
| Approved version replaced by draft         | Immutable reviewed SQL bytes; fork creates a distinct draft; session/release stays pinned                           |
| Concurrent duplicate release               | Simultaneous actual HTTP requests: same-key retry succeeds idempotently, different stale key fails; one release row |
| Revoked privileged role operates           | Existing login cannot retrieve runner/media/export after live grant revocation                                      |
| Frontend role manipulation                 | Body role field adds no authority; each server request derives identity and grant                                   |
| Private metadata/export leakage            | Investigator output excludes facilitator identity, session ID, script, schedule and production records              |
| Direct media bypass                        | Participant/draft/investigator/foreign/no-credential requests tested independently of page controls                 |

## Findings fixed during verification

- **High usability/integration:** `Referrer-Policy: no-referrer` made native browser form POST origins null, causing legitimate CSRF rejections. Real browser testing detected it despite passing hand-built HTTP tests. `same-origin` now preserves native same-origin verification and suppresses external referrers.
- **Serious accessibility:** brand's custom accessible label excluded its visible tagline. The override was removed; the visible text supplies the accessible name. Axe rerun is required on the candidate.
- **Workflow:** runner actions initially returned to the home screen. Actions now keep the facilitator in the persisted runner.
- **Dependency:** initially resolved development lint tooling included a minimatch glob amplification advisory. A patched override was installed and lockfile audit rerun. There are no runtime npm dependencies.
- **Local data protection:** SQLite files are explicitly mode 0600, including when an existing directory is used. Demo credential preflight refuses an existing handoff file before mutating a fresh seed.

## Remaining limitations and gates

- Physical iPhone Safari, VoiceOver and no-coaching trials with Cristy/nontechnical users are **UNVERIFIED**. Automated desktop WebKit is not iOS Safari. Screenshots are a design review, not Cristy's approval.
- Public synthetic fixture source reveals its invented solution to a source reader. Runtime authorization prevents unintended audience retrieval; it cannot make public source fiction secret. Real approved private campaign content must be separately provisioned, not committed to source.
- Auth is scoped local accounts with random seeded passwords, scrypt, eight-hour sessions, live revocable grants and 15-minute login rate windows. MFA/passkeys, password reset, IdP, production operator audit and real-user onboarding are absent. A privileged host/DB operator can bypass app triggers. This is not a compliance product.
- Future retrieval is revoked; already viewed content, downloads, printouts and screenshots cannot be remotely recalled. No service worker caches content. Exports use authorized printable HTML; actual printer/PDF output has not been reviewed on a physical device.
- The illustrated teaser is complete without audio/video. There is no playable teaser, caption track or narration claim. Media failure preserves the text.
- Production Node mode refuses synthetic data and requires HTTPS origin; real TLS reverse proxy, host hardening, monitored encrypted off-host backup, retention and incident restore have not been tested. Older backups can resurrect access; revocation reconciliation is mandatory before incident recovery.
- One-episode campaign studio deliberately lacks real scheduling, actual staff records, arbitrary asset uploads and role-management endpoints. No generalized 16-episode CMS, email deliverability or Cloudflare D1 portability is claimed.
- Client contract, hosting/privacy/IP rights, Cristy's content/visual sign-off, specialist review where required, and explicit production authorization remain external gates. No real invitation, appointment, client launch or deployment occurred.

An engineer should trace one sensitive request from `server.ts` identity/CSRF to `domain.ts` scoped transition, then its parameterized SQL transaction, immutable receipt and audience projection. Review this trace and the negative tests before accepting a client release; AI-written explanation is not proof that a human operator understands it.
