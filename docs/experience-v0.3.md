# The Current — Product Experience Contract V0.3

Date: 2026-11-04. Status: PROPOSED EXPERIENCE DESIGN; founder-authorized development, not Cristy-approved, implemented, deployed, or accepted.

## 1. The promise

One purposeful screen at a time. The Current is a warm, narrative briefing system that lets an invited employee receive an understandable teaser, a facilitator conduct a guided 30-minute conversation, an investigator review deliberately released fictional evidence, and a producer prepare and version the campaign safely. The product does not assess employees, measure loyalty, record clinical conversations, or merge confidential professional feedback with a game.

The Current is a standalone client-facing app built by Mizvo. Mizvo Studio remains the separate development, production, and client-delivery workspace. Nothing in the initial product requires a Mizvo account or a direct connection to Mizvo's database.

### Experience principles

1. **Human value first:** A nontechnical person identifies the main action and completes a meaningful task without training.
2. **Zero packet assembly:** No ZIP, MIME draft, or combined private master is required for any audience.
3. **One audience, one projection:** Each identity receives only its authorized content from the server, never a cosmetically hidden universal page.
4. **Deliberate reveal:** Scheduling, completion, and elapsed time never publish clues or send messages automatically.
5. **Narrative with dignity:** The mystery is optional entertainment; culture-listening questions are voluntary, constructive, non-scored, and kept separate.
6. **Beautiful but reliable:** Audibly playable media, captions, text fallback, readable controls, and interruption recovery matter more than animation complexity.

## 2. Audience and navigation contracts

| Surface | Landing view | Primary action | Secondary views | Data never shown |
| --- | --- | --- | --- | --- |
| Participant | Your Invitation | Play teaser / see confirmed meeting | Transcript, help | Private script, clues, other attendees, investigation |
| Facilitator (Cristy) | Today's Briefings | Start a ready briefing | Preview, guided runner, completion, previous | Other organizations' sessions; unapproved content in public presentation |
| Investigator (Jim) | Evidence Desk | Inspect released fictional evidence | Chronology, case pages, finale when released | Staff identifiers or feedback, private scripts, unreleased evidence |
| Producer (Mizvo) | Campaign Studio | Complete production/review tasks | Cases, assets, audience previews, approvals, delivery audit | Employee conversation notes and patient data |

Privilege is scoped by organization, campaign, case, session, content version, asset class, and role. Account creation for low-risk participant previews should be avoided when an expiring, revocable invitation token suffices; this requires a threat review.

## 3. Screen A — Participant invitation

**Framing:** A beautifully illustrated, single-scroll invitation resembling a personal sealed letter, not a dashboard. Focal point is one original marine scene; title, 1–2 sentence premise, time/place (only when confirmed), accessible 20–40 second teaser, and one straightforward action.

**Composition, mobile:**
- Small top identity: THE CURRENT / YOUR INVITATION.
- Original illustration with elegant dark-to-light ocean gradient; do not put essential text inside an image.
- Headline: “Your story begins here.” Campaign/case descriptor below.
- A visible media player with captions ON by default when speech is present; transcript always one tap away.
- Appointment chip: “Your conversation: [verified time]” or “Cristy will confirm your time” — never invent a booking.
- Primary action: “See my briefing details” / “Join at the scheduled time” only if join capability really exists.
- Support text: “No preparation required. The mystery is optional.”

**States:** valid link, loading, scheduled, time-unconfirmed, teaser-unavailable, weak network, expired, revoked, case withdrawn, cancelled. A rejected or expired link gives a safe generic explanation and approved contact path; no leaked case details.

**Rules:** No pre-reveal asset in HTML, API response, metadata, open graph preview, static bundle, or cached asset URL. No click/reading surveillance by default. Responsive and fast on low-bandwidth phone connections.

## 4. Screen B — Cristy's Today

**Framing:** Start with today's actual work. Avoid dense enterprise sidebars. A warm welcome and a small number of session cards with legible readiness.

**Information hierarchy:** “Next briefing” first; scheduled time if verified, assigned case, case-version approval, video/audio readiness, single “Start briefing” button. Below: Later today, Needs attention, Previous sessions.

**Actions:** Preview audience-safe output; enter private preflight; Start only when case content is approved; reschedule/cancel and regenerate links with clear warning about old invitations; Help / export fallback.

**State labels:** Ready, Needs review, Missing time, Invitation pending, In progress, Completed, Aborted. These are grounded in persisted state, never a pretty percentage with unknown meaning.

**Monica Test:** Without explanation, Cristy should recognize tomorrow's first session and open the runner in under three taps from authentication. The test is aspirational until observed with real users.

## 5. Screen C — Facilitator runner

**Layout:** Immersive full-window story canvas with a concise progress rail and a private presenter-notes pane that is hidden from the separate participant presentation output. On iPhone, private notes are the primary view; reveal media opens a distinct participant-safe display with a confirmation to prevent accidental oversharing.

**Six guided moments (timing suggestions, not enforced):**

| Window | Moment | Facilitation intent | Screen affordance |
| --- | --- | --- | --- |
| 00–03 | Welcome | Set voluntary and non-scored expectations | Short private notes, optional read-aloud cue |
| 03–10 | Keep | What supports a good first 90 days? | One prompt and an optional follow-up |
| 10–18 | Change | What creates unnecessary friction? | One prompt, discretion reminder |
| 18–23 | Try | What is one useful improvement? | One prompt, no in-app feedback recording |
| 23–27 | Reveal | Optional fictional scene, deliberately opened | Large “Reveal fictional clue” with confirmation |
| 27–30 | Close | Check understanding; explain safe follow-up | Brief closing guide, mark complete |

**Controls:** Previous/Next moment, Pause session, Open participant-safe display, Play/Pause narration, View transcript, Reveal (only when permitted), Mark complete, Exit/Abort. All are labeled; irreversible/share actions have confirmatory copy.

**Persistence:** A browser refresh resumes the same approved case version and last explicit moment; elapsed wall-clock time never moves a moment automatically. Client-side offline content can support reading; no approval, completion, release, or send is claimed until server acknowledgement. Interrupted media offers captions/transcript, readable slides, and printable PDF.

**Safety:** Sharing the full device screen can expose private notes; the product should guide Cristy to share only the participant-safe view. Prevent the participant screen from fetching private script or culture prompts that are not intended for the presentation.

## 6. Screen D — Completion and evidence

Completion is not publication.

After the session, the facilitator sees “Briefing complete. Your fictional evidence is ready to review.” The system creates a precise Jim-only preview from the approved evidence version, displays the correct case and recipient, and provides “Approve evidence release” plus “Save for later.” No default send. A manual delivery receipt must never state sent merely because the content was drafted.

**Completion states:** In progress → Completed → Evidence prepared → Approved for release → Released / Delivery confirmed. Cancellation, retraction, case reassignment, duplicate delivery and later corrections require explicit state handling and immutable audit history.

## 7. Screen E — Jim's evidence desk

**Framing:** Theatrical investigation journal, not a staff-surveillance dashboard. A campaign index of released case files, an unfolding illustrated chronology, a focused fictional evidence page, and a locked finale.

**Case card:** Number, fictional scene title, verified release status/date, one-sentence question, printable/downloadable approved evidence. Evidence pages contain only story facts, approved images, and optional notes Jim writes about the fictional mystery if separately scoped. They must not contain a staff name, private feedback, or session attendance.

**Empty/locked state:** “No evidence released yet. New case files appear only after the corresponding briefing.” Show locked case silhouette without unreleased case titles or spoilers when not authorized. Finale is visible as a locked destination, not an accessible hidden route.

**Corrections:** Previous released versions stay auditable by authorized producer/facilitator. Investigator sees a clear “Revised evidence” notice and the approved current copy, not silent alterations.

## 8. Screen F — Mizvo campaign studio

**Purpose:** Produce cases, not micromanage workers. A campaign timeline with 16 slots, continuity markers, scene editor, preview by audience, audio/caption checks, production and approval ledger, and separate delivery records.

**Producer workflow:** Create draft → Add original/right-cleared media → Generate/attach captions & transcript → Preview each audience projection → Run validation → Request Cristy's review → Version-specific approval → Prepare distribution. Any content modification after approval creates a new draft version and does not inherit approval.

**Case editor panels:** Story beats, scene order, audience entitlement, clue release gate, script, asset rights/provenance, caption/transcript, device previews, accessibility, approval history, dispatch records. Producer can create content but cannot impersonate Cristy to approve professional release.

**No future creep in pilot:** No AI employee assessment, sentiment scoring, voice recording, passive monitoring, automated SMS, attendance analytics, or CRM/ERP integration.

## 9. Initial synthetic interaction story

Use an entirely original public sample: **Demo 000 — The Quiet Buoy.** At an imagined shoreline, a ceremonial beacon stopped pulsing during a festival. A maintenance slate shows a planned pause; the scene explores how a harmless operational handoff can resemble a crisis when no one explains it. Demo content is invented, not an adaptation or publication of Cristy's Bikini Bottom campaign.

Demonstrate one 20-second text/captioned teaser, one short private facilitator prompt, one deliberate reveal, and one post-session fictional evidence PDF/ledger entry. Show that the participant and investigator cannot fetch the private prompt or unapproved reveal, including by direct URL.

## 10. Responsive and visual direction

Coastal editorial cinema: warm ivory paper, midnight tidal ink, sea-glass translucent layers, hand-crafted original underwater textures, soft rounded forms, restrained coral and brass highlights. This is distinct from Mizvo's internal visual identity.

Typography: characterful editorial serif for campaign/story headlines; accessible, open-licensed sans for controls, numerals and metadata. Text belongs in DOM. Use generous vertical rhythm, clear focus outlines, strong contrast and spacious tap targets (at least 44 CSS px), not ornamental text-heavy cards. Mobile widths 320/390/430; tablet 768/1024; desktop 1440/1920. Prefer an original small guide motif only if it improves comprehension and Cristy approves.

Motion: soft parallax/tidal transitions only when purposeful. Always offer reduced-motion mode. Media controls remain usable with animation disabled or audio muted. Narration must be independently audible/playback-tested on recipient devices, not assumed from MP4 metadata.

## 11. Acceptance scenarios

- A participant with a valid invitation can play the spoiler-free teaser with captions; a revoked token yields no private content.
- Guessing or directly requesting facilitator scripts, unreleased video, investigators' PDFs, and another person's case is denied by the server.
- Cristy can select a real assigned session, preview, enter a six-moment runner, pause/recover, reveal manually and complete without uploading or opening ZIPs.
- A completed session does NOT automatically send evidence. A separately approved, version-bound release appears only for the investigator.
- Editing an approved case invalidates the new version's approval and does not mutate historical released evidence.
- Mobile controls are legible at 320/390px, VoiceOver reads meaningful labels, captions/transcript work with audio unavailable, reduced-motion does not hide key interactions.
- An audience-export preview contains no unauthorized material even if metadata, HTML source, media URLs and direct API responses are inspected.
- Cristy and at least one nontechnical tester complete the main journey without developer guidance before any client-facing release.

## 12. Status and dependencies

Founder development approval and a separate GitHub repository are established. Cristy's actual workflow and the three November 5 email packages are historical requirements and a parallel immediate delivery, not proof of a platform contract. The visual identity, sample content, and technology remain proposals until refined and approved. No staff-facing release, Jim dispatch, automatic email, payment, third-party IP use, or production deployment is authorized by this document.

For ownership and historical source of truth, see the Cristy Signal Desk and Mizvo company record in Notion.