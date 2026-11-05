# The Current — Visual Language and Interaction System V0.3

Status: design proposal for founder review, not an approved Cristy brand, finished artwork, or shipped UI. No actual employee or client information is included.

## Creative premise

**A modern field journal from a world beneath the surface.** The visual identity conveys discovery, warmth, professional trust and anticipation. It borrows an editorial rhythm (large expressive titles, clear body copy, generous margins, small numbered artifacts) rather than a generic SaaS dashboard or a game HUD.

The Current is independently branded. Mizvo's graphite/copper architecture may influence engineering quality, but not visually overpower Cristy's experience. The first story references marine imagery because of its creative setting, but the platform's reusable components should be theme-agnostic.

## Design tokens — candidate values, subject to contrast checking

| Token | Draft value | Use |
| --- | --- | --- |
| tidal.ink | #12383D | Primary text and deep scene backgrounds |
| tidal.deep | #09292F | Cinematic headers and dramatic text contrast |
| tide.glass | #4F8586 | Teal accent, not default small-text on light surfaces |
| tide.mist | #D7E8E2 | Soft backgrounds and dividers |
| paper.warm | #F7F1E7 | Main soft canvas |
| paper.white | #FFFCF8 | Dense body copy surfaces |
| coral.soft | #ECA58C | Small accents and illustration warmth, not sole state indicator |
| brass.soft | #C9A775 | Editorial markers, not primary controls |
| ink.secondary | #4D6565 | Secondary copy, subject to contrast test |
| danger.dark | #8D3030 | Errors, paired with text and icon |

Do not assume this palette passes contrast checks without testing actual text/background pairs. Critical actions should have dark ink backgrounds and light text. Never use a near-pastel accent alone to indicate permission, errors, or completion.

## Typography

- Display headlines: warm, licensed/open-licensed editorial serif (evaluate Fraunces or Newsreader for weight, counters and readability); original lettering may eventually become a custom mark.
- UI and body: licensed/open-licensed highly legible sans (evaluate Inter or Manrope). Distinct strong numerals for timers and case indices.
- Headline hierarchy on mobile: page title around 32–38px, section title around 24–28px, ordinary body 16–18px, supporting metadata at least 13–14px where contrast is adequate.
- Prevent auto-shrinking hero text to illegibility. Never embed needed text in decorative imagery.
- Focus labels and interactive controls use clear verb-first language, not vague verbs such as “Engage.”

## Spatial system

- Radius: hero frame 28–36px, cards 20–28px, buttons 14–20px, minor chips 999px.
- Baseline spacing 4px with an 8px rhythm. Mobile page gutters 20–24px; desktop content width capped around 1160–1280px depending on view.
- Buttons: touch targets at least 44px high/wide, primary actions 52–60px high when practical; comfortable adjacent hit-area spacing.
- Minimal primary navigation: 2–4 entries per role, progressive disclosure of settings and administration.
- Favor layered surfaces and restrained gradients over many borders. Aim for strong readable focal point per page.

## Screen compositions

### Participant invitation

Portrait-friendly, image-first. Hero art approximately 16:10 on mobile or responsive crop, restrained ocean light, small “An invitation from The Current” line, large event headline, brief subhead, 16:9 native media player with captions and readable transcript. Timing/status and one primary CTA below. Fallback displays illustration plus story excerpt.

### Facilitator home

Paper surface, small wordmark, “Good evening” only if date/time is truly local and known; the next scheduled briefing appears as the single large action card. Status chips must be backed by server data. Avoid a grid of arbitrary analytics or “productivity” scores. A compact upcoming list follows, with help and completed sessions secondary.

### Facilitator runner

Large calm scene canvas, one prominent stage number, compact progress meter (six named stages), a private script panel and a fixed bottom action bar. When reveal is available, the specific action is named “Reveal fictional clue” and must open a confirmation sheet. Participant-safe projection opens as a separate strongly differentiated view. Audio scrubber, captions and transcript are accessible even if the artwork fails.

### Investigator desk

Wide editorial dossier with paper-like cards, a central case chronology, numbered released evidence files and a sealed finale. Use an original art direction with tactile folder/folio motifs but retain native semantic text and buttons. Unreleased clues remain server-inaccessible; a silhouette is not a visual permission mechanism.

### Campaign production

Higher information density allowed. Left: episodes and continuity. Center: scene/copy/asset editor. Right: audience preview and validation/approval checklist. Collapses to step-based mobile layout; no editable WYSIWYG functionality is claimed until implemented. Every preview prominently names its selected audience and exact version.

## Interaction and motion

- 120–220ms hover/focus state transitions; 240–420ms intentional scene changes. Values are illustrative; accessibility and device performance govern.
- Ocean current motion is quiet ambient atmosphere, never bouncing icons or continuous attention demand.
- Reduce-motion preference eliminates parallax and decorative movement without removing access to scenes or media controls.
- Reveal animation reinforces user choice: confirm → short transition → evidence on screen. No surprising timed unseal.
- Interruption recovery: re-enter at the last confirmed stage, with visible “Resume” and no fictional evidence released without deliberate action.
- Loader >1s gets descriptive text; failed video gets “View transcript” + “Open slides” rather than a dead player.
- Support keyboard, touch, screen readers and large text without content loss.

## Tone of voice

Clarity before cleverness. Story language can be evocative; controls should be literal. Private facilitator language is supportive, concise and not judgmental.

Suggested synthetic copy:
- Participant headline: “Something changed with the tide.”
- Subhead: “A short story and a conversation await. No preparation needed.”
- Facilitator button: “Start this briefing.”
- Reveal prompt: “Show the approved fictional evidence to this session?”
- Jim empty state: “Your investigation begins with the first released case.”
- Media failure: “The video isn't available. Read the transcript or open the slide version.”
- Protected content: “This material is not available to this account.”

Avoid guilt, gamified staff scoring, invasive recognition, invented appointment times, or claims that anonymity/confidentiality is guaranteed.

## Original assets and identity

Public repositories use original abstract aquatic textures, illustrated buoy/chart motifs, vector iconography and synthetic demo names only. The approved launch film and any franchise-specific client art remain outside this public codebase unless appropriate explicit rights are established. An optional original gentle guide/mascot is a later creative review item, not a v1 dependency.

An open-source engine must remain configurable by campaign theme: colors, logo/mark, imagery, narration style, episode art, copy, and release rules are campaign data, not hardwired cartoon branding. This allows Mizvo to deliver original, client-specific experiences while keeping The Current itself distinct.

## Evaluation requirements

Measure usefulness with actual task completion rather than aesthetic preference alone:
- In a phone-based rehearsal, facilitator opens scheduled session, moves between stages, reveals manually, completes and prepares evidence with no trainer.
- Participant identifies the scheduled experience, plays/reads teaser and understands that mystery participation is optional.
- Investigator recognizes which clues have been released and cannot see anything pending.
- Producer previews the role-specific output and catches a deliberately inserted spoiler before approval.
- At 320/390/768/1440 widths, no clipping/overflow; check keyboard-only and VoiceOver; formal WCAG 2.2 AA target with automated and human audits.
- Every colored status has textual meaning and no critical control relies solely on motion or sound.

## Open visual approvals

Cristy has not yet approved this exact palette, wordmark, original mascot, theme architecture or interface layout. Keep this as a well-grounded proposal until real previews and her no-coaching usability trial are complete.