// SPDX-License-Identifier: AGPL-3.0-only
export interface Story {
  title: string;
  premise: string;
  teaser: string;
  prompts: string[];
  clue: string;
  evidence: string;
  resolution: string;
}
export const stages = [
  "Welcome",
  "KEEP",
  "CHANGE",
  "TRY",
  "Fictional reveal",
  "Reflection & close",
];
export const windows = ["00–03", "03–10", "10–18", "18–23", "23–27", "27–30"];
export const story: Story = {
  title: "The Quiet Buoy",
  premise:
    "At Larkspur Reach, the observation buoy has missed its nightly signal. A curious log entry and a missing maintenance page suggest that someone chose the silence.",
  teaser:
    "Each night, a small light answers the shore. Last night, the water stayed dark. At Larkspur Reach, one unanswered signal has become a question. Bring your curiosity. No preparation is needed.",
  prompts: [
    "Welcome. This is a voluntary conversation about making work better. You may pass on any question. The fictional mystery is optional. Nothing said here is recorded in this application.",
    "What is working well? What helps you feel supported when a task moves from one person to another? Give people room to think; do not ask for names.",
    "Where do handoffs become difficult? What information would make a challenging moment easier? Keep sensitive concerns within your authorized professional process, outside this application.",
    "What is one small, practical change we could try? Who would need to agree? Discuss it aloud; this application has no response fields.",
    "Ask whether the group would like the fictional clue. If so, deliberately reveal it. A quiet signal can have more than one explanation. The timer never opens this scene.",
    "Thank people for their time. Reflect on one useful idea without entering responses here. Explain your separately authorized follow-up process. Close the fictional scene without treating it as a judgment of anyone.",
  ],
  clue: "Maintenance slate · 21:40. “Hold the night pulse. Listening window begins at 22:00. Restore on the shore bell.” Signed: Mara Vale, fictional acoustic technician. A narrow blue carbon strip is tucked beneath the slate.",
  evidence:
    "Artifact 000-A · Blue carbon strip. The missing maintenance page was filed in the hydrophone cabinet, not destroyed. It records a planned twenty-minute radio silence to listen for a migrating pod. The shore team received the old checklist, which omitted the pause. Log entry: “Quiet by agreement; acknowledgement pending.” All names and records are fictional.",
  resolution:
    "The buoy was deliberately silenced for a harmless acoustic survey. Mara assumed the revised checklist had reached the shore; the shore assumed silence meant failure. The missing page and the blue carbon strip match. The mystery resolves to a missed handoff, not sabotage. A written acknowledgement would have closed the loop.",
};
export function validateStory(value: unknown): value is Story {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    ["title", "premise", "teaser", "clue", "evidence", "resolution"].every(
      (k) =>
        typeof s[k] === "string" &&
        (s[k] as string).trim().length > 10 &&
        (s[k] as string).length < 5000,
    ) &&
    Array.isArray(s.prompts) &&
    s.prompts.length === 6 &&
    s.prompts.every(
      (p) => typeof p === "string" && p.length > 10 && p.length < 3000,
    ) &&
    Object.keys(s).length === 7
  );
}
export function illustration(kind: "shore" | "clue"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 640" role="img" aria-label="${kind === "shore" ? "An observation buoy off the cliffs of a fictional coastal settlement at dusk" : "An original illustrated maintenance slate and blue carbon strip"}"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#09292f"/><stop offset="1" stop-color="#669c9c"/></linearGradient><linearGradient id="sea" x2="0" y2="1"><stop stop-color="#397478"/><stop offset="1" stop-color="#09292f"/></linearGradient><radialGradient id="glow"><stop stop-color="#f2d5a0" stop-opacity=".55"/><stop offset="1" stop-color="#f2d5a0" stop-opacity="0"/></radialGradient></defs><path fill="url(#sky)" d="M0 0h1200v640H0z"/><circle cx="825" cy="170" r="160" fill="url(#glow)"/><circle cx="825" cy="170" r="30" fill="#f1d6a5"/><path d="M0 300 Q270 240 450 310T1200 290V640H0Z" fill="url(#sea)"/><path d="M0 150L130 180 205 270 340 315 265 363 0 430Z" fill="#12383d"/><path d="M0 150L130 180 205 270 100 250 0 285Z" fill="#71938b"/><path d="M50 180v-65h58v75M46 115l33-25 34 25" fill="#d5d9be"/><path d="M68 130h20v20H68z" fill="#f4d7a0"/><g fill="none" stroke="#b5d4c8" opacity=".35" stroke-width="2"><path d="M330 420q180-25 360 0t400 0M90 510q180-25 360 0t500 0M450 570q180-25 360 0t400 0M540 350q100-15 210 0"/></g>${kind === "shore" ? '<g transform="translate(735 340)"><ellipse cy="90" rx="84" ry="12" fill="#09292f"/><path d="M-42 60H42L22 85H-22Z" fill="#d8b17b"/><path d="M-20 60L-10-35H10L20 60Z" fill="#db9c81"/><path d="M-15-38H15L0-58Z" fill="#f0d6a0"/><path d="M0-58v-28" stroke="#e8e2cd" stroke-width="3"/></g>' : '<g transform="translate(420 100) rotate(-6 200 230)"><rect width="440" height="420" rx="18" fill="#f7f1e7"/><rect x="28" y="30" width="384" height="360" rx="8" fill="#d7e8e2"/><path d="M65 100h300M65 140h250M65 180h280M65 220h180" stroke="#4f8586" stroke-width="6"/><path d="M45 275h350v55H45z" fill="#35708a"/><circle cx="350" cy="355" r="19" fill="none" stroke="#4f8586" stroke-width="3"/></g>'}</svg>`;
}
