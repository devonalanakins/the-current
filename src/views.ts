// SPDX-License-Identifier: AGPL-3.0-only
import { token } from "./store.js";
import {
  type Actor,
  type Briefing,
  Current,
  type Evidence,
  type Version,
} from "./domain.js";
import { stages, windows, type Story } from "./content.js";
export const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const mark = `<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M4 13Q17 1 30 13T56 13M4 25Q17 13 30 25T56 25" fill="none" stroke="currentColor" stroke-width="3"/></svg><span class="wordmark">the current<span class="wordline">STORIES THAT OPEN CONVERSATIONS</span></span>`;
export function layout(title: string, body: string, actor?: Actor, nav = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="description" content="The Current — original synthetic narrative briefing demonstration."><title>${esc(title)} · The Current</title><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script></head><body><a class="skip" href="#main">Skip to content</a><header><a class="brand" href="${actor ? "/workspace" : "/"}">${mark}</a><nav aria-label="Main">${nav}${actor ? `<a href="/workspace">Workspace</a><form method="post" action="/logout"><input type="hidden" name="csrf" value="${esc(actor.csrf)}"><button class="quiet">Sign out</button></form>` : ""}</nav></header><main id="main">${body}</main><footer><span>THE CURRENT · MIZVO</span><span>Synthetic demonstration · no real appointments or communications</span><a href="https://github.com/devonalanakins/the-current" rel="noreferrer">AGPL source</a></footer><div id="activity" class="sr-only" role="status" aria-live="polite"></div><div id="connection" role="status" hidden><span>You are offline. Your last confirmed progress is saved. Reconnect before continuing.</span> <a href="" data-reload>Reload saved state</a></div></body></html>`;
}
export function form(
  actor: Actor,
  action: string,
  id: string,
  revision: number,
  label: string,
  extra = "",
  cls = "",
) {
  return `<form method="post" action="/action" class="${esc(cls)}"><input type="hidden" name="csrf" value="${esc(actor.csrf)}"><input type="hidden" name="action" value="${esc(action)}"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="revision" value="${revision}"><input type="hidden" name="key" value="${token()}">${extra}<button>${esc(label)}</button></form>`;
}
export const badge = (s: string) =>
  `<span class="badge">${esc(s.replaceAll("_", " ").toLowerCase())}</span>`;
export const intro = (k: string, title: string, copy: string) =>
  `<div class="intro"><p class="eyebrow">${esc(k)}</p><h1>${esc(title)}</h1><p class="lede">${esc(copy)}</p></div>`;
export function invitationView(
  data: ReturnType<Current["participant"]>,
  presentation = false,
) {
  return `<article class="invitation"><div class="invitation-copy"><p class="eyebrow">${presentation ? "PARTICIPANT-SAFE DISPLAY" : "A PERSONAL INVITATION"} · EPISODE 000</p><h1>${presentation ? "A moment beneath the surface." : "Something changed with the tide."}</h1><div class="rule"></div><p class="story-title">${esc(data.title)}</p><p class="lede">${esc(data.premise)}</p><a class="button" href="#details">${presentation ? "See the story" : "See my briefing details"} <span aria-hidden="true">↗</span></a><p class="fine">No preparation needed. The mystery is optional.</p></div><figure class="scene"><img src="${data.asset}" alt="An observation buoy beyond a coastal research settlement at dusk"><figcaption>LARKSPUR REACH · AN ORIGINAL FICTIONAL WORLD</figcaption><div class="image-fallback" hidden>The shoreline is quiet. An observation buoy waits offshore. The full story is available in the text below.</div></figure></article><section class="letter" id="details"><span class="seal" aria-hidden="true">≈</span><p class="eyebrow">YOUR CONVERSATION</p><h2>A little curiosity. A little room to talk.</h2><p>${data.scheduled ? esc(data.scheduled) : "Your organizer will confirm the time. No appointment has been booked in this demonstration."}</p><p>This is a voluntary, guided 30-minute conversation. There is nothing to submit here. You may pass on any question.</p><details open><summary>Read the illustrated teaser</summary><p>${esc(data.teaser)}</p></details><p class="fine">This text and the original illustration form the complete teaser. No audio or video is required.</p>${presentation ? (data.clue ? `<section class="reveal"><p class="eyebrow">DELIBERATELY REVEALED · FICTIONAL ARTIFACT</p><img src="${data.clueAsset}" alt="Maintenance slate and blue carbon strip"><p>${esc(data.clue)}</p></section>` : `<aside class="notice">The fictional scene remains sealed until your facilitator deliberately opens it.</aside><a class="button secondary" href="/presentation">Check for the reveal</a>`) : ""}<details><summary>Need help?</summary><p>Ask the organizer who provided this link for timing or a replacement invitation. This demonstration does not send messages or record your responses.</p></details></section>`;
}
export function briefingHome(
  app: Current,
  actor: Actor,
  briefings: Briefing[],
) {
  return (
    intro(
      "YOUR BRIEFINGS",
      "Room for a good conversation.",
      "One story, six gentle stages. Every confirmed step is saved.",
    ).replace('class="intro"', 'class="intro briefing-intro"') +
    (briefings.length
      ? briefings
          .map((b) => {
            const v = app.version(b.version),
              s = app.story(v);
            return `<section class="next-card"><div><p class="eyebrow">${b.state === "COMPLETED" ? "COMPLETED BRIEFING" : "NEXT ASSIGNED BRIEFING"}</p>${badge(b.state)}<h2>${esc(s.title)}</h2><p>Episode 000 · Story version ${v.number} · ${esc(v.status.toLowerCase())}</p><p>${b.scheduled ? esc(b.scheduled) : "Time unconfirmed · synthetic rehearsal"}</p><p>Illustrated teaser and readable script available. No recording.</p><div class="actions">${b.state === "READY" ? form(actor, "start", b.id, b.revision, "Start briefing") : ["ACTIVE", "PAUSED"].includes(b.state) ? `<a class="button" href="/run/${esc(b.id)}">Resume briefing</a>` : ""}<a class="button secondary" href="/run/${esc(b.id)}">${b.state === "COMPLETED" ? "View completion" : "Preview & details"}</a></div></div><figure class="mini-scene"><img src="/media/${v.id}/shore" alt="A quiet coastal research settlement"></figure></section>`;
          })
          .join("")
      : '<section class="card"><h2>No assigned briefings</h2><p>Your organizer will assign a briefing when the story is ready.</p></section>')
  );
}
export function runner(app: Current, actor: Actor, b: Briefing) {
  const v = app.version(b.version),
    s = app.story(v);
  const active = b.state === "ACTIVE";
  const interruptible = ["ACTIVE", "PAUSED"].includes(b.state);
  const elapsed =
    b.elapsed +
    (b.running_since ? Math.max(0, Date.now() - b.running_since) : 0);
  const e = app.store.get<Evidence>(
    "SELECT * FROM evidence WHERE briefing=?",
    b.id,
  );
  return `<div class="runner-heading"><div><p class="eyebrow">PRIVATE FACILITATOR WORKSPACE · VERSION ${v.number}</p><h1>${esc(s.title)}</h1></div>${badge(b.state)}</div><div class="session-status"><div><strong>Stage ${b.stage + 1} of 6 · ${esc(stages[b.stage])}</strong><span>${b.state === "PAUSED" ? "Paused · resume when you are ready" : b.state === "COMPLETED" ? "Completion saved · evidence release is separate" : "Progress saved · timer never reveals a clue"}</span></div><span class="clock" role="timer" aria-live="off" data-elapsed="${elapsed}" data-running="${b.state === "ACTIVE"}" aria-label="Elapsed briefing time">${Math.floor(
    elapsed / 60000,
  )
    .toString()
    .padStart(2, "0")}:${Math.floor((elapsed / 1000) % 60)
    .toString()
    .padStart(
      2,
      "0",
    )}</span></div><ol class="stages">${stages.map((name, i) => `<li ${i === b.stage ? 'aria-current="step"' : ""}><span>0${i + 1}</span>${esc(name)}</li>`).join("")}</ol>${b.state === "COMPLETED" ? `<section class="letter"><p class="eyebrow">BRIEFING COMPLETE</p><h2 id="moment" tabindex="-1">Thank you for making space.</h2><p>Completion is saved. Evidence ${e ? esc(e.state.toLowerCase().replaceAll("_", " ")) : "has not been prepared"}. Nothing was sent.</p><p>The producer prepares the fictional packet. A separate authorized approver reviews and releases this exact version.</p></section>` : `<div class="runner-grid"><section class="prompt"><p class="eyebrow">MOMENT 0${b.stage + 1} · APPROX. ${windows[b.stage]} MINUTES</p><h2 id="moment" tabindex="-1">${esc(stages[b.stage])}</h2>${b.state === "PAUSED" ? '<p class="notice">Take your time. The timer is stopped, and your place is saved. Resume to continue.</p>' : ""}<p class="script">${esc(s.prompts[b.stage])}</p><aside class="notice">Private prompts. Share only the separate participant-safe display. No employee responses are collected here.</aside>${b.stage === 4 ? (b.revealed ? `<div class="reveal"><h3>Fictional clue revealed</h3><p>${esc(s.clue)}</p></div>` : active ? form(actor, "reveal", b.id, b.revision, "Confirm: reveal fictional clue", `<label class="check"><input type="checkbox" name="confirm" value="yes" required> I intend to reveal the approved fictional scene.</label>`) : "") : ""}<div class="runner-controls">${active && b.stage > 0 ? form(actor, "previous", b.id, b.revision, "Previous stage", "", "secondary-form") : ""}${active && b.stage < 5 ? form(actor, "next", b.id, b.revision, "Next stage") : active ? form(actor, "complete", b.id, b.revision, "Complete briefing") : b.state === "READY" ? form(actor, "start", b.id, b.revision, "Start briefing") : ""}${b.state === "ACTIVE" ? form(actor, "pause", b.id, b.revision, "Pause", "", "secondary-form") : b.state === "PAUSED" ? form(actor, "resume", b.id, b.revision, "Resume briefing") : ""}</div></section><aside class="scene-panel"><img src="/media/${v.id}/shore" alt="Observation buoy at dusk"><div class="panel-copy"><p class="eyebrow">SLOW DOWN. LISTEN WELL.</p><h3>The timer is a guide.</h3><p>Stages and fictional clues move only when you choose. Refreshing restores your last confirmed action.</p></div></aside></div>`}<section class="card"><h2>Invitation & presentation</h2><p>Links last 24 hours and can be withdrawn. They are shown once; no email is sent. Open presentation in a separate browser context before sharing it.</p><div class="actions">${["READY", "ACTIVE", "PAUSED"].includes(b.state) ? form(actor, "invite", b.id, b.revision, "Create participant link", `<input type="hidden" name="audience" value="participant">`, "secondary-form") + form(actor, "invite", b.id, b.revision, "Create safe-display link", `<input type="hidden" name="audience" value="presentation">`, "secondary-form") : ""}${form(actor, "revoke-invites", b.id, b.revision, "Withdraw all links", "", "secondary-form")}</div><details><summary>End this rehearsal without completing</summary>${interruptible ? form(actor, "abort", b.id, b.revision, "Abort briefing", `<label class="check"><input type="checkbox" name="confirm" value="yes" required> End this rehearsal and revoke its invitations.</label>`, "secondary-form") : "<p>No active rehearsal.</p>"}</details></section>`;
}
export function studio(
  app: Current,
  actor: Actor,
  campaign: string,
  review = false,
) {
  const versions = app.store.all<Version>(
    "SELECT * FROM versions WHERE campaign=? ORDER BY number DESC",
    campaign,
  );
  const briefings = app.store.all<Briefing>(
    "SELECT * FROM briefings WHERE campaign=?",
    campaign,
  );
  return (
    intro(
      review ? "CONTENT & RELEASE AUTHORITY" : "CAMPAIGN STUDIO",
      review ? "A deliberate second pair of eyes." : "Make the story ready.",
      "Demo 000 · The Quiet Buoy · original synthetic content. Preparation, approval, publication, completion, and release are separate events.",
    ) +
    versions
      .map((v) => {
        const s = app.story(v);
        const editable = ["DRAFT", "CHANGES_REQUESTED"].includes(v.status);
        return `<section class="card"><div class="section-heading"><div><p class="eyebrow">STORY VERSION ${v.number}</p><h2>${esc(s.title)}</h2></div>${badge(v.status)}</div><p>${esc(s.premise)}</p><div class="actions">${review ? (v.status === "IN_REVIEW" ? form(actor, "approve", String(v.id), v.revision, "Approve exact story version") + form(actor, "changes", String(v.id), v.revision, "Request changes", "", "secondary-form") : v.status === "APPROVED" ? form(actor, "publish", String(v.id), v.revision, "Publish approved version") : "") : editable ? form(actor, "review", String(v.id), v.revision, "Request content review") : form(actor, "fork", String(v.id), v.revision, "Create new draft version", "", "secondary-form")}${
          !review && v.status === "PUBLISHED"
            ? form(
                actor,
                "assign",
                String(v.id),
                v.revision,
                "Create synthetic rehearsal",
                `<label>Assign facilitator<select name="facilitator" required>${app.store
                  .all<{ user_id: string }>(
                    "SELECT user_id FROM grants WHERE campaign=? AND role='facilitator' AND revoked=0 AND expires>?",
                    campaign,
                    Date.now(),
                  )
                  .map(
                    (g) =>
                      `<option value="${esc(g.user_id)}">${esc(g.user_id)}</option>`,
                  )
                  .join("")}</select></label>`,
                "secondary-form",
              )
            : ""
        }${review && ["PUBLISHED", "APPROVED"].includes(v.status) ? form(actor, "revoke", String(v.id), v.revision, "Withdraw story version", "", "secondary-form") : ""}</div><details><summary>Audience-specific previews · version ${v.number}</summary><div class="actions">${["participant", "facilitator", "investigator"].map((a) => `<a class="button secondary" href="/preview/${v.id}/${a}">Preview ${a}</a>`).join("")}</div></details>${!review && editable ? `<details><summary>Edit original story content</summary>${form(actor, "edit", String(v.id), v.revision, "Save draft", `${(["title", "premise", "teaser", "clue", "evidence", "resolution"] as const).map((field) => `<label>${esc({ title: "Episode title", premise: "Spoiler-free invitation", teaser: "Illustrated teaser text", clue: "Manually revealed fictional clue", evidence: "Investigator evidence", resolution: "Fictional resolution" }[field])}<textarea name="${field}" rows="${field === "title" ? 2 : 4}" maxlength="4999" required>${esc(s[field])}</textarea></label>`).join("")}${s.prompts.map((p, i) => `<label>Private stage ${i + 1} · ${esc(stages[i])}<textarea name="prompt${i}" rows="4" maxlength="2999" required>${esc(p)}</textarea></label>`).join("")}<p class="fine">Original synthetic fiction only. Changes to published stories need a new version and fresh approval.</p>`)}</details>` : ""}<details><summary>Original assets & validation</summary><p>${validateLabel(s)} · text and illustration fallback ready · no playable media required.</p>${app.store
          .all<{
            classification: string;
            rights: string;
            hash: string;
            bytes: number;
          }>(
            "SELECT classification,rights,hash,bytes FROM assets WHERE version=?",
            v.id,
          )
          .map(
            (a) =>
              `<div class="asset"><strong>${esc(a.classification)}</strong><p>Original SVG · ${esc(a.rights)} · ${a.bytes} bytes</p><code>${esc(a.hash)}</code></div>`,
          )
          .join("")}</details></section>`;
      })
      .join("") +
    `<section class="card"><p class="eyebrow">POST-BRIEFING EVIDENCE</p><h2>Release only what was approved.</h2>${briefings
      .map((b) => {
        const e = app.store.get<Evidence>(
          "SELECT * FROM evidence WHERE briefing=?",
          b.id,
        );
        return `<div class="release-row"><h3>Episode 000 · version ${app.version(b.version).number}</h3><p>Briefing: ${esc(b.state.toLowerCase())} · clue: ${b.revealed ? "manually revealed" : "sealed"} · evidence: ${e ? esc(e.state.toLowerCase().replaceAll("_", " ")) : "unprepared"}</p>${!review && !e && b.state === "COMPLETED" && b.revealed ? form(actor, "prepare", b.id, b.revision, "Prepare fictional evidence") : review && e?.state === "READY_FOR_REVIEW" ? form(actor, "approve-evidence", b.id, e.revision, "Approve exact evidence version") : review && e?.state === "APPROVED_FOR_RELEASE" ? form(actor, "release", b.id, e.revision, "Release evidence to investigator") : ""}</div>`;
      })
      .join(
        "",
      )}</section><section class="card"><h2>Approval & audit history</h2><p>Immutable records. No sends or delivery receipts are implied.</p><ol class="chronology">${
      app.store
        .all<{
          action: string;
          actor: string;
          version: number;
          created: number;
        }>(
          "SELECT action,actor,version,created FROM audit WHERE campaign=? ORDER BY id DESC LIMIT 100",
          campaign,
        )
        .map(
          (e) =>
            `<li><strong>${esc(e.action.replaceAll("-", " "))}</strong><span>${esc(e.actor)} · version ID ${e.version} · ${esc(new Date(e.created).toISOString())}</span></li>`,
        )
        .join("") || "<li>No actions yet.</li>"
    }</ol></section>`
  );
}
function validateLabel(s: Story) {
  return s.prompts.length === 6
    ? "Six stages validated"
    : "Validation incomplete";
}
export function desk(app: Current, actor: Actor, campaign: string) {
  const items = app.investigator(actor, campaign);
  return (
    intro(
      "THE EVIDENCE DESK",
      "Some silences tell a story.",
      "Only deliberately released fictional records appear here. Nothing in this dossier represents employee feedback.",
    ) +
    `<div class="dossier-label"><span>LARKSPUR REACH / CASE FILE 000</span><span>${items.length} RELEASED ${items.length === 1 ? "RECORD" : "RECORDS"}</span></div>` +
    (items.length
      ? items
          .map(
            (r) =>
              `<article class="dossier"><div class="folio"><p class="eyebrow">FICTIONAL ARTIFACT · RELEASE ${r.id}</p><h2>${r.withdrawn ? "Withdrawn evidence" : esc(r.title)}</h2>${badge(r.withdrawn ? "withdrawn" : r.supersedes ? "corrected release" : "released")}<p>Story version ${r.version} · ${esc(new Date(r.created).toISOString())}</p>${r.supersedes ? `<p class="notice">Correction: supersedes release ${r.supersedes}. Earlier records remain in the chronology.</p>` : ""}${!r.withdrawn ? `<p class="evidence-text">${esc(r.evidence)}</p><details><summary>Read the fictional resolution</summary><p>${esc(r.resolution)}</p></details><a class="button secondary" href="/export/${r.id}">Open printable evidence</a>` : "<p>The authorized approver withdrew this version. Its content is unavailable.</p>"}</div>${!r.withdrawn ? `<figure><img src="${r.asset}" alt="Fictional maintenance slate and blue carbon strip"></figure>` : ""}</article>`,
          )
          .join("")
      : `<section class="empty"><span class="seal" aria-hidden="true">≈</span><h2>Your investigation begins with the first released case.</h2><p>No fictional evidence has been released to this desk. Check back after the briefing and authorized review.</p><a class="button secondary" href="/desk?campaign=${esc(campaign)}">Check for released evidence</a></section>`) +
    `<section class="card"><h2>Case chronology</h2><ol class="chronology">${items.map((r) => `<li><strong>${r.withdrawn ? "Withdrawn" : r.supersedes ? "Correction" : "Evidence released"} · version ${r.version}</strong><span>${esc(new Date(r.created).toISOString())}</span></li>`).join("") || "<li>Case sealed. No released events.</li>"}</ol></section>`
  );
}
