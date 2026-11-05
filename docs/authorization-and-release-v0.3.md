# The Current — Authorization, Content and Release Contract V0.3

Status: proposed technical/design specification; not implemented or security-certified. Last designed 2026-11-04.

## Audience separation is a backend invariant

The Current has four hard boundaries: invited participant, authorized facilitator, investigator, producer. Each route and media object is checked against a server-authoritative permission scope. Frontend filtering is for presentation only, never security. No audience is permitted to fetch a combined “master email,” universal episode JSON, private blob, or metadata containing hidden spoilers.

The facilitator's workplace-culture conversation is **out of scope for storage in v1**. The product does not record employees, transcripts of their actual conversations, health/patient information, or staff performance/loyalty scores. Any professional follow-up uses a separate process authorized by Cristy and the organization's policies.

## Permission matrix (allow only where noted)

| Operation / resource | Participant | Facilitator | Investigator | Producer |
| --- | --- | --- | --- | --- |
| Open assigned approved prebriefing invitation | Scoped token | Read assigned | No | Preview only |
| Play approved spoiler-free teaser | Scoped token | Yes | No until separately released | Preview draft |
| Read private 30-minute facilitator script | No | Assigned cases only | No | Editable production copy, not actual employee notes |
| Start/pause/complete briefing | No | Assigned session only | No | No |
| Approve a case version for professional use | No | Named client approver only | No | Request approval; cannot self-grant |
| Reveal approved scene during assigned session | No autonomous action | Explicit manual action | No | Preview only |
| View released fictional evidence | No | Assigned case | Released campaigns only | Preview/verify |
| Approve and execute evidence release | No | Explicit authorized action | No | Prepare, never silently send |
| See actual employee feedback or patient information | No | Not stored here | No | No |
| Manage roles, assets and campaign versions | No | Narrow rights where assigned | No | Scoped to authorized campaigns |

Where a producer is also the owner of a synthetic demo, test fixtures may use separate explicitly seeded roles. Production business data is never made visible by a test-role toggle.

## Minimum persistent model

- Organization, campaign, episode, scene and audience-specific content projection.
- Asset record containing classification (public teaser, facilitator private, investigator released, internal draft), provenance, rights, transcript/captions, content hash, length and version.
- Content version, approval identity/time/scope/version and immutable audit event.
- Session and assignment, lifecycle, resumed runner stage and case-version pin.
- Invitation token hash, expiration, revocation and narrow audience/session scope.
- Evidence release as an immutable event binding a specific approved story-version, corresponding completed session (internally, access-restricted), authorized actor, recipient scope and optional delivery receipt.
- Accounts/role grants, their expiry/revocation, and audit events.

Case numbering for a campaign is independent of participant identity. Never place staff names, session notes or appointment details in the investigator's case metadata, PDF, notification, or URLs.

## State machines

**Content:** DRAFT → IN_REVIEW → CHANGES_REQUESTED / APPROVED → PUBLISHED. Changes after APPROVED create another DRAFT version; prior approved versions are immutable. REVOKED prevents new renders/distribution, subject to safe evidence correction handling.

**Session:** SCHEDULED → READY → ACTIVE ↔ PAUSED → COMPLETED or ABORTED/CANCELLED. Completion does not imply external notification or published evidence.

**Evidence:** UNPREPARED → READY_FOR_REVIEW → APPROVED_FOR_RELEASE → RELEASED. A RELEASED record can later be SUPERSEDED_BY_CORRECTION with a visible corrected version; it cannot be silently overwritten or erased from the authorized audit trail.

**Invitation:** CREATED → ACTIVE → EXPIRED/REVOKED/REPLACED. Rescheduling that changes a case or audience scope revokes the old link before issuing a replacement. Historical delivery status remains truthful even if an invitation is invalidated.

All transitions require server-side identity, scope, source-version, state, and concurrency checks. Idempotency keys prevent duplicate release on a double click; stale approvals and reused invitation links cannot bypass revocations.

## Content projections (no universal mixed bundle)

1. **Participant invitation projection:** verified case title/premise, scheduled time if confirmed, safe original artwork, spoiler-free teaser and captions/transcript, supported action, no facilitator notes or future clues.
2. **Facilitator production projection:** assigned schedule, private prompts, story sequence, version, and controlled scene/reveal; no raw employee feedback.
3. **Investigator release projection:** the approved released fictional clue, printable evidence, current correction notice and authorized campaign chronology only.
4. **Producer projection:** draft story scripts, rights-cleared assets, previews, approval receipts, content status. Production staff cannot pull real staff feedback through the app.

Media authorizations must be scoped to object class, actor/session and version; prefer short-lived media URLs backed by a private object store. Unapproved media must never be shipped in the public frontend bundle. Teaser thumbnails and sharing previews are separately classified to prevent hidden clues in filenames or alt text.

## Threat cases to test before client use

- Uninvited user guesses a participant token or another case ID.
- Expired/replaced invitation still loads a cached or direct video URL.
- Jim requests the next case PDF, draft caption, private facilitator route or staff identity field.
- A participant changes a client-side role flag, query parameter or hidden DOM element.
- Producer previews approved version 3 while editing version 4 and tries to publish without fresh approval.
- Cristy starts a session with a reassigned case, out-of-date audio or missing transcript.
- Evidence gets released twice due to repeated button presses, network retries, or concurrent tabs.
- Revoked facilitator or investigator holds a still-open browser session or media URL.
- A client campaign accesses another organization's stories, exports or media.
- Public Github code accidentally includes a client's licensed cartoon art, private email, sensitive transcript, production secret or unapproved brand/logo.

## Delivery and operational boundaries

For V0.3 design, **drafts and safe exports are sufficient**. Sending outbound email and tracking delivery may be added only with explicit client approval, appropriate recipients, secure sender verification, content approval and actual end-to-end tests. Never mark “sent” on a mock dispatch or file creation.

Recipient-facing email is generated from an approved projection. It must not include facilitator-only or investigator-only blocks to manually delete. Cristy's already-sent November 5 review masters were private work products, not successful proof of customer-ready delivery or of recipient mobile playback.

The organization determines how real staff concerns are collected, safeguarded, reported and acted on. An employer with approximately 16 participants may be able to identify people from sparse or paraphrased feedback; no “anonymous aggregate” is promised merely by removing names.

## Independent architecture boundary

Public The Current repository contains original software/design system and synthetic fixtures only. Private campaign content stays in separately authorized secure storage, subject to client rights. Mizvo is the vendor, not a shared identity or common database.

Candidate portable TypeScript web/API design; self-hosted SQL adapter and optional verified Cloudflare D1 adapter; S3-compatible private media storage; robust account/session security and regular backups. Deployment, compliance, operating budget and authentication stack are uncommitted until engineered and tested.

Devon-owned code follows the AGPL-3.0-only standing preference, with official license text and notices when source is published. This does not transfer Cristy's rights, Jim's organization's rights, or third-party media rights.

## Release gate

No client-facing launch until: actual end-to-end permission tests (including direct media), real device voice/audio/captions verification, accessible 320/390px and desktop checks, independent rights and privacy review, client-approved script/story version, explicit authorization to host/use audience data, and tested fallback/recovery. This is a testable gate, not a claim that verification already happened.
