# Operations and release gates

## Configuration

Node 24.10–24.x only. Run commands from the repository root so migration and public-asset paths resolve. `npm ci` installs locked development tools; `npm run build` emits server code into ignored `dist/`. The running server needs Node, `dist/`, `public/`, `migrations/`, and its private writable SQLite directory, not node_modules. Preserve the source and AGPL notice for recipients.

| Variable       | Default               | Meaning                                                                             |
| -------------- | --------------------- | ----------------------------------------------------------------------------------- |
| CURRENT_DB     | data/current.sqlite   | Private SQLite path; never a public assets directory                                |
| CURRENT_ORIGIN | http://127.0.0.1:3000 | Exact trusted Origin for native forms; never derived from Host or forwarded headers |
| CURRENT_HOST   | 127.0.0.1             | Local bind address; retain for isolated review                                      |
| PORT           | 3000                  | Listener port                                                                       |
| NODE_ENV       | unset                 | `production` requires HTTPS and refuses the synthetic demo organization             |

No dotenv loader is present. Pass variables through the shell/process supervisor. No API keys are needed. Demo passwords are generated, stored only as scrypt hashes in SQL, and shown in a local ignored mode-0600 credential handoff file. Bearer invitations are shown once and hashed in storage. Never log URLs with fragments, request bodies, cookies or backup contents. The server logs only a generic internal failure category.

## Backup and restore

Create a private destination directory before running:

```sh
npm run backup -- data/current.sqlite /private/path/new-backup.sqlite
```

The command never overwrites. It uses a consistent SQLite snapshot while the server may be running; then checks database and foreign-key integrity and sets mode 0600. Store encrypted off-host backups according to an approved retention/ownership policy before any client deployment. SQLite itself is not encrypted at rest. The local synthetic recovery test does not prove off-host backup, encryption, retention, or disaster recovery.

For a restore/rollback rehearsal: stop the server; preserve its current database/WAL/SHM together; choose a new private restore filename; copy the validated snapshot there with mode 0600; start with `CURRENT_DB` pointing to that new file. Do not overwrite an open DB. Re-run tests and confirm expected version/release/grants before use. **A historical backup may resurrect revoked sessions or invitations:** an actual incident restore must expire all `logins`, set all `invitations.revoked=1`, reconcile current grants/revocations, and require fresh authentication before allowing access. Keep that recovery activity in the authorized incident record. This candidate test restores a synthetic historical snapshot intentionally.

Current migration is additive initial schema only. No production database or destructive migration was touched. For future migrations: snapshot first, rehearse against a copy, compare row/version counts, and use an explicitly compatible application/schema pair for rollback. Do not infer that old binaries support new schemas.

## Privileged access

Only a trusted local operator with DB access can manage users/grants. No role-management web endpoint exists. Seeded grants expire after 30 days; login sessions after eight hours. A grant revocation takes effect on the next request, including a direct media/export request. Revocation SQL must target exact user/campaign/role and be audited through the organization's approved operator process; there is no production operator identity/audit integration yet. Password reset, MFA/passkeys, external IdP provisioning and account recovery are not implemented; real-client authentication requires a deliberate approved design and review.

## Hosting, rollback and release

No production, public preview, DNS, paid resources, email provider or customer access was provisioned. `/health` provides a minimal local readiness response only. This is a **local synthetic candidate**, not a public service. Do not bind it publicly for review without a separately approved access/TLS design. A self-hosted staging installation would use a private network, authenticated TLS reverse proxy, explicit trusted origin, least-privilege filesystem user, restricted egress, external process supervision and monitored encrypted backups. Real proxy/TLS configuration has not been tested here. No Cloudflare deployment configuration is supplied because this Node/SQLite implementation is not Worker-compatible.

Production is blocked in code for the seeded organization. Removing this gate is not client approval. Before any client staging/launch: obtain Cristy's content/professional approval; resolve ownership/contract, hosting budget and private campaign IP; approve identity/access and privacy; verify real iPhone Safari/VoiceOver and no-coaching usability; test exact candidate backup/restore and revocation reconciliation on the approved host; verify real TLS/session settings; then obtain explicit release authorization. No staff/patient information belongs in this V1.
