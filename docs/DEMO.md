# Replay The Quiet Buoy

Use the README installation commands and fresh local credentials. All identities, stories, artifacts and sessions are synthetic. The application records workflow actions, never actual conversation responses. Use separate browser profiles for each role; signing out also works for serial testing.

1. **Rowan / producer:** open Campaign Studio. Expand the edit section if desired, save the draft, and inspect the three separate audience previews and asset metadata. Choose **Request content review**. This does not publish anything.
2. **Ellis / approver:** sign in with a separate account. Inspect the exact version through the previews. Choose **Approve exact story version**, then **Publish approved version**. Requesting changes returns it for revision. Rowan cannot approve their own work or publish it.
3. **Mira / facilitator:** the next briefing is now Ready, pinned to story version 1. Time is unconfirmed. Open **Preview & details**, then **Create participant link**. Copy the limited URL shown once. It expires in 24 hours; **Withdraw all links** revokes it and all presentation links. No email is sent.
4. **Participant:** open that URL in a separate browser context. The fragment credential is exchanged for an HttpOnly cookie and removed from the address bar. Read the invitation, follow **See my briefing details**, and read the illustrated teaser. Private scripts and evidence are never retrieved. If an image fails, the readable story remains available.
5. **Mira:** return to Your Briefings and choose **Start briefing**. Move explicitly through Welcome → KEEP → CHANGE → TRY. Pause/resume or reload: the saved stage and elapsed time recover. Timing is advisory and never moves a stage or reveals a clue. Do not enter real responses anywhere.
6. At **Fictional reveal**, optionally create a **safe-display link** and open it in another context before sharing. It is a separate credential and projection. Confirm the checkbox and **Confirm: reveal fictional clue**. Refresh the safe display to see the slate; the ordinary participant invitation still has no clue. Share only that safe display, not facilitator notes.
7. Move to Reflection & close and choose **Complete briefing**. The completed state persists. Oren's Evidence Desk is still empty. Skipping the optional reveal allows completion but prevents this demo's evidence release.
8. **Rowan:** choose **Prepare fictional evidence** for the completed, revealed session. **Ellis:** review the investigator preview, choose **Approve exact evidence version**, then separately **Release evidence to investigator**. This publishes only inside the scoped application, without messaging anyone.
9. **Oren:** refresh the Evidence Desk. The exact released version now appears with chronology, original illustration, fictional evidence, resolution and a printable export. The browser's native print dialog can save a PDF. No server PDF service is involved.
10. **Optional correction rehearsal:** Rowan creates a new draft from the published version, edits it, and requests review. Ellis approves and publishes that distinct version. Rowan creates a **synthetic rehearsal** for that version and an existing facilitator grant. Repeat the deliberate runner/evidence sequence. The newer release visibly supersedes the old one; historical evidence is retained. Existing briefings remain pinned to their old versions.

To replay from a clean slate, stop the server and use a **new database path**, preserving prior data rather than deleting it. Run `CURRENT_DB=data/replay.sqlite npm run seed` after moving the previous `data/demo-credentials.json` into a private local location; the credential file intentionally refuses overwrites. Then `CURRENT_DB=data/replay.sqlite npm start`. Never use real appointment or employee data in this candidate.

## Failure rehearsal

- Withdraw the links, then reload an old invitation and request its image directly: no content is returned.
- Keep the investigator signed in before release: a guessed media or export URL is denied.
- Pause and restart the server: resume at the saved stage. Active elapsed time includes time while the server was stopped; pause before planned interruptions.
- If a request fails or goes offline, do not assume success. Reconnect and reload. Only server-confirmed state is authoritative.
