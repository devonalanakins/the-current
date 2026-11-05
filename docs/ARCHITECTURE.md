# Architecture and implementation contract

## Portable runtime

Node 24 TypeScript server-rendered HTML, native `node:http`, native `node:sqlite`, SQL migrations, and a small public enhancement script. There are **zero runtime npm dependencies**, no client-side role store, and no downloadable universal campaign JSON. Native forms support ordinary operation without JavaScript; invitation fragments have a manual credential fallback. No separate authentication database, Mizvo Studio dependency, external asset CDN, paid service, R2 bucket, or microservice exists.

Cloudflare Workers/Static Assets/D1 were evaluated against portability and this first application. The inspected account had no matching Current Worker or D1 name. `node:sqlite` is a Node native API and this candidate is **not Worker-compatible**. It must not be deployed with Wrangler or described as a verified D1 adapter. A later D1 adapter requires asynchronous persistence/transaction design and the same authorization/concurrency tests. Private generated SVG is small enough to authorize and render on demand; private object storage is unnecessary here.

## Layers and trust boundaries

- `src/store.ts`: parameterized SQL, migrations, transactions, token hashing, scrypt.
- `src/content.ts`: original synthetic fixture, validation and original SVG generation; server-only.
- `src/domain.ts`: campaign grants, version/assignment checks, state transitions, audience projections, immutable approvals/releases, media authorization.
- `src/views.ts`: escaped semantic HTML with no authority of its own.
- `src/server.ts`: identity, Origin/CSRF, request limits, cookies, HTTP routes and headers.
- `public/`: generic CSS/JS only; no drafts, script text, clue data or credentials.

A request passes identity → live grant/expiration → campaign → assignment or release → pinned version/state → projection. Every media/export request repeats its checks. Cache responses are `private, no-store`, with no ETag or 304 path. Browser history traversal revalidates. Already seen/downloaded content cannot be recalled from a recipient's memory or files; revocation denies future retrieval, not retroactive erasure.

## Relational model

`organizations` owns `campaigns`; grants bind users to campaigns and roles (organization derives from the campaign). `versions` contain immutable reviewed story JSON, a version number, author, state and revision. Six prompts are deliberately a fixed-size versioned story structure, rather than a premature arbitrary scene CMS. `assets` bind original generated SVG bytes/hash/length, provenance, license and audience classification to a version. `briefings` bind campaign/version/facilitator/stage/timing/reveal state and revision; there are no participant or response tables.

`invitations` store only a SHA-256 token hash, assigned briefing/version/audience, expiry and revocation. Participant and presentation credentials are distinct. `logins` store only hashed bearer tokens, CSRF secrets and expiry. Passwords use salted scrypt (Node defaults N=16384,r=8,p=1,64 bytes). `evidence` represents preparation/review; `approvals`, `releases` and `audit` have database triggers rejecting updates/deletion. `receipts` binds actor + idempotency key to exact action/target/revision/input digest. SQLite `BEGIN IMMEDIATE`, revision checks and a unique release-per-briefing constraint protect transitions. Deployment is one local SQLite writer; horizontal multi-node writers are unsupported.

Migrations run transactionally once using the `migrations` ledger. Current schema is `migrations/001-initial.sql`. WAL and foreign keys are enabled. Backups use SQLite `VACUUM INTO` and integrity/foreign-key checks rather than copying an active main file without its WAL.

## Permissions

| Action                              | Participant credential                          | Assigned facilitator                 | Producer                        | Named approver                                    | Investigator                   |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------- | ------------------------------ |
| Approved invitation and shore image | Own invitation only                             | Own briefing                         | Explicit preview                | Explicit preview                                  | No                             |
| Private script                      | No                                              | Own published version                | Production preview/edit draft   | Review preview                                    | No                             |
| Start/pause/resume/stages/complete  | No                                              | Own published briefing               | No                              | No                                                | No                             |
| Reveal                              | Presentation credential reads only after reveal | Explicit active stage-5 confirmation | Preview only                    | Preview only                                      | No                             |
| Draft/edit/request review           | No                                              | No                                   | Own campaign                    | No                                                | No                             |
| Approve/publish/withdraw            | No                                              | No                                   | No                              | Own campaign; cannot approve own authored version | No                             |
| Prepare evidence                    | No                                              | No                                   | Completed and manually revealed | No                                                | No                             |
| Approve/release evidence            | No                                              | No                                   | No                              | Separate explicit actions, exact version          | No                             |
| Released dossier/media/export       | No                                              | Assigned version media               | Preview                         | Review preview                                    | Released campaign/version only |
| Change grants                       | No                                              | No                                   | No                              | No                                                | No                             |

There is deliberately no in-app role-grant endpoint. Grants are provisioned/revoked by a trusted offline operator; user-controlled role fields have no effect. Tests use separate synthetic identities and an unrelated organization.

## State machines

- Content: DRAFT → IN_REVIEW → APPROVED → PUBLISHED. IN_REVIEW → CHANGES_REQUESTED → edit → IN_REVIEW. APPROVED/PUBLISHED → REVOKED. Reviewed bytes cannot be edited; a fork creates a new draft. Approval/publication never repins existing briefings.
- Briefing: SCHEDULED → READY on publication; READY → ACTIVE ↔ PAUSED → COMPLETED at stage 6. READY/ACTIVE/PAUSED → ABORTED with confirmation. CANCELLED is a stored denial state, without a scheduling UI in this synthetic candidate. Stages move only explicitly; clue reveal requires active stage 5 and a confirmation.
- Evidence: absent → READY_FOR_REVIEW → APPROVED_FOR_RELEASE → RELEASED. Completion and manual reveal are required. Release references the exact version/completed briefing and recipient campaign. A newer approved release records `supersedes`; earlier records remain visible. Withdrawing a version removes retrievable evidence but retains withdrawal metadata.
- Invitation: absent → active only after publication → expired/revoked. Reissue creates a distinct random credential, never a scope mutation. No rescheduling or real dispatch is implemented.

## Reconciliation with V0.3

The new execution directive's observation-buoy/research-settlement premise supersedes the earlier ceremonial-festival example. The portable SQL candidate is selected; D1 remains unevaluated at runtime. The teaser uses complete text/illustration rather than placeholder playable media. Native printable HTML replaces an unverified server PDF generator. A distinct synthetic approver exercises Cristy's retained authority without assigning it to the producer. Production previews can see draft fiction, explicitly labelled and version-bound; ordinary audience routes cannot. This is one complete original episode, not the proposed future 16-case CMS or real client campaign.
