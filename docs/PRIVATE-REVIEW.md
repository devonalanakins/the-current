# G1.5 private synthetic review

This package runs the existing Node 24/SQLite application. It does not deploy a Worker, create a D1 adapter, provision a host, authorize access or expose a public URL. PRs #1 and #2 remain separate and unmerged. The three client email packages are unrelated and untouched.

## Runtime and environment boundaries

Use one Linux host, one unprivileged service identity, a single application process and a local persistent SQLite directory. The application binds **only 127.0.0.1**. An approved existing HTTPS proxy/private network supplies access later; do not publish port 3000. Cloudflare Access/Tunnel can protect an approved future proxy, but no tunnel, identity integration, DNS or Access policy is provisioned or claimed here.

`deploy/the-current.service` is an operator-reviewed systemd template. It expects Node 24 at `/usr/bin/node`, a committed release at `/opt/the-current/current`, a private environment file at `/etc/the-current/staging.env`, and mode-0700 persistent storage at `/var/lib/the-current/synthetic-staging`. It uses a nonprivileged user, read-only system protection, private temporary storage and bounded shutdown. Review actual host paths before installation. No host/systemd installation was performed in this Work session.

`deploy/Caddyfile.local` is an optional **loopback-only** HTTPS template, using Caddy's internal CA and no public ACME. An authorized operator may run it on the same host and forward loopback TLS over SSH for private desktop review. Its origin must be exactly `https://localhost:3443`; establish trust in the private CA through the approved process. Do not disable browser certificate validation. Caddy execution, host CA trust and actual private networking remain unverified here. Mobile evaluation requires an independently approved reachable HTTPS host/private network; a desktop SSH tunnel does not establish iPhone compatibility.

| Environment       | Database                                           | Origin                  | Content                                      |
| ----------------- | -------------------------------------------------- | ----------------------- | -------------------------------------------- |
| development       | default `data/current.sqlite` or explicit new path | loopback HTTP allowed   | synthetic development only                   |
| synthetic-staging | explicit absolute isolated path                    | explicit HTTPS required | original seeded synthetic organizations only |
| production        | explicit absolute isolated path                    | explicit HTTPS required | seeded synthetic organization is refused     |

`CURRENT_ENV` controls the boundary. `NODE_ENV=production` cannot override it to a less restricted mode. Non-loopback application binding, invalid ports, origin paths/credentials, missing databases and cross-environment/origin reuse are refused. Database environment binding is local operational protection, not cryptographic attestation. A privileged DB operator can alter it. Synthetic staging validates organization identifiers; it does not inspect prose for personal data. Operators must keep all review inputs synthetic.

## Reproduce locally

From a fresh checkout of PR #2 with Node 24.10–24.x:

```sh
npm ci
npm run build
npm run seed
npm start
```

Open `http://127.0.0.1:3000`. The seed never overwrites an existing DB or handoff. Read `data/demo-credentials.json` privately; do not paste it into a PR, screenshot or chat. Passwords are random and no message is sent. The five accounts include an outsider denial fixture; only four have Quiet Buoy access. Follow `docs/DEMO.md` for the complete participant/producer/approver/facilitator/investigator sequence.

For a replay, choose a **new private directory**, not just another filename beside an existing credential file:

```sh
CURRENT_DB=data/replay-02/current.sqlite npm run seed
CURRENT_DB=data/replay-02/current.sqlite npm start
```

For an approved future staging host, use the variables in `deploy/staging.env.example` through the supervisor, changing only the approved origin and paths. Provision with that **same environment** using `npm run seed`, then start with it. No dotenv loader exists. Credential handoff is beside that environment's DB; development credentials do not unlock staging. Never copy a development database into staging. Startup health at `/health` queries the migration table and returns generic 503 if unavailable. Startup performs quick/foreign-key checks; backups perform full integrity checks. SIGTERM/SIGINT allow requests to drain, force-close connections after five seconds, then close SQLite. Restart preserves saved stages and timers; paused time stays paused. Pause before planned interruptions.

After tests pass and source is committed:

```sh
npm run release:package -- /private/new-release-directory
```

The package builds from a clean committed checkout and includes runtime, source, migrations, operational scripts, docs and license. It omits all databases, credentials, node_modules and test artifacts. `SOURCE_COMMIT` identifies the exact source; `MANIFEST.sha256` checks package transport integrity (`sha256sum -c MANIFEST.sha256` from the package root). Only tracked source and a clean generated build are copied, excluding even ignored files hidden beneath source directories. On the approved host, stop the service, snapshot the DB, switch the release directory and start. New migration 002 is additive. A v1 DB's existing organization/workflow rows remain. Legacy pending evidence without recorded preparer identity cannot be approved; run a fresh synthetic rehearsal. Checksums detect later migration-file drift; they cannot retrospectively prove the original v1 migration's provenance. Downgrades to the old binary are **not** asserted compatible: restore the matching DB snapshot/application pair offline instead.

## Confidential backup and quarantined restore

Use private real directories without symlink parents. SQLite itself is not encrypted at rest. The encrypted recovery CLI uses AES-256-GCM with an independently stored 32-byte key, fresh nonce and authenticated format header. It creates a consistent live-WAL snapshot, checks full integrity and foreign keys, encrypts it and refuses overwrites. A temporary plaintext snapshot exists in a mode-0700 temporary directory and is removed in `finally`; use encrypted host storage and approved temporary storage policy. The CLI is intended for this small synthetic database and buffers snapshots in memory; large-client backup streaming is outside this release.

```sh
npm run recovery -- keygen /private/keys/current-recovery.key
npm run recovery -- backup /private/staging/current.sqlite /private/backups/review-01.current /private/keys/current-recovery.key
npm run recovery -- restore /private/backups/review-01.current /private/restores/review-01.sqlite /private/keys/current-recovery.key
```

Key loss makes the backup unrecoverable. Store an approved separately secured key copy; never commit keys. Restore authenticates before creating output, rejects wrong keys/tampering, checks the SQLite contents, writes to a **new** path and removes all login sessions, revokes every invitation, quarantines **all grants**, and pauses active briefings. It preserves fictional releases/audit/version history and the environment marker. Saved elapsed time is preserved; an unconfirmed active interval is not reconstructed. Old passwords alone cannot retrieve protected material while grants are quarantined.

Do not replace or overwrite the running DB. Stop the service, preserve its DB/WAL/SHM, restore to a new path, and reconcile current revocations/content withdrawals with the responsible owner **offline**. Reauthorize exact users/campaigns/roles and provision fresh passwords before any restarted review; do not bulk-reactivate historical grants. No web admin/grant-reset shortcut is provided. An old snapshot can contain withdrawn content; successful decryption does not authorize publishing it. Off-host transfer, retention, key custody and disaster recovery on a real host remain approval/verification gates. The older `npm run backup` is a restricted plaintext snapshot utility for local analysis only.

## No-coaching test (two synthetic reviewers, 10–15 minutes)

An operator first prepares fresh accounts and a published synthetic story, using the producer and separate approver. Give each tester only their assigned synthetic role URL/credential; observe silently. Do not send invitations or grant outside access in this session.

1. Participant: open the limited invitation; explain what it asks you to do and whether the time is confirmed. Find the teaser. Pass if no explanation or private material is needed.
2. Facilitator: find the next briefing, start it, move one stage, pause, close/reopen the page and resume. Find the current stage/time without help. Continue to the reveal; explain which view is safe to share, then deliberately reveal and complete. Pass if they understand the prompts are private, reveal is deliberate and completion sends nothing.
3. Investigator: observe the sealed desk before release and the fictional dossier afterward. Find the version, chronology and printable record. Pass if no employee feedback is expected or exposed.
4. Producer/approver: use separate identities; revise/request review, inspect exact audience previews, approve/publish, then separately prepare/approve/release evidence. Pass if ownership and version boundaries are understood.

Record task completion, wrong turns, hesitation and tester words without employee/client data. Any coaching is a failed attempt requiring a targeted improvement and retest. Actual Cristy/nontechnical acceptance, physical iPhone Safari, VoiceOver and independent human security review are not satisfied by automated screenshots or this author-written test.
