# The Current

A self-hostable narrative briefing application built by Mizvo. **Demo 000 — The Quiet Buoy** is original synthetic fiction. This implementation has participant invitations, a six-stage facilitator runner, a restricted evidence desk, and a versioned producer/reviewer workflow. It contains no employee feedback collection, recording, email delivery, client materials, or production integration.

**Release posture:** source candidate for isolated synthetic review. Not merged, not deployed, not a client-ready release. Production mode refuses the seeded demo database. Exact commit and current CI results belong to the implementation PR, not an inferred claim in this README.

## Run the demonstration

Requires Node **24.10–24.x** and npm. Use a new empty `data/` directory. The seed refuses an existing database. No paid services or runtime npm dependencies are needed.

```sh
npm ci
npm run build
npm run seed
npm start
```

Open <http://127.0.0.1:3000>. Read the generated `data/demo-credentials.json` locally; it contains fresh random passwords, is ignored by Git, and must not be uploaded or shared. Use separate browser profiles/contexts for the synthetic roles:

| Username | Role                            | Workspace                               |
| -------- | ------------------------------- | --------------------------------------- |
| rowan    | Producer                        | Campaign Studio                         |
| ellis    | Client approver                 | Version Review                          |
| mira     | Facilitator                     | Your Briefings                          |
| oren     | Investigator                    | Evidence Desk                           |
| outsider | Other organization investigator | Isolation fixture; no Quiet Buoy access |

The accounts are fictional; they do not represent Cristy or Jim. [Full replay instructions](docs/DEMO.md) cover every deliberate approval, reveal, completion and release. No appointment is invented and no invitation is sent. The teaser is accessible original text and illustration; there is no recorded audio/video to caption or play.

## Verify

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm audit --audit-level=moderate
npx playwright install --with-deps chromium webkit
npm run test:browser
```

Tests create isolated random credentials and disposable databases, exercise real HTTP denial paths, and save responsive screenshots/Axe results under `artifacts/ui/`. They never contact clients. Physical iPhone Safari, VoiceOver, real-user usability, real TLS/hosting and client rights/content approval are separate unverified release gates. Browser emulation does not prove those gates.

## Engineering handoff

- [Architecture, data, permissions and state machines](docs/ARCHITECTURE.md)
- [Setup, environment, backup/restore and deployment gates](docs/OPERATIONS.md)
- [Security review and verification scope](docs/SECURITY-REVIEW.md)
- [Assets, dependencies and source notices](THIRD-PARTY-NOTICES.md)
- Original proposed design contracts: [experience V0.3](docs/experience-v0.3.md), [authorization V0.3](docs/authorization-and-release-v0.3.md), [visual V0.3](docs/visual-system-v0.3.md). These are preserved proposals; the implementation reconciliation is in the architecture document.

AGPL-3.0-only. See [LICENSE](LICENSE). Original software and synthetic fiction do not grant rights to any client or third-party materials. Source repository: <https://github.com/devonalanakins/the-current>.

## G1.5 private-review continuation

[Private review operations](docs/PRIVATE-REVIEW.md) documents the isolated staging package, environment validation, encrypted recovery, approval-contributor protections and no-coaching test. Startup now requires an existing database; seed creates a new isolated DB and a private credential handoff beside it. PR #2 remains unmerged; no host or public endpoint is provisioned.
