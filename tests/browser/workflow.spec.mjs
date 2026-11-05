import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fixture } from "../helpers.mjs";
import { application } from "../../dist/server.js";

test("four audiences complete the real lifecycle; responsive, keyboard, recovery and Axe review", async ({
  browser,
}, info) => {
  const f = fixture();
  const config = { origin: "http://127.0.0.1", secure: false };
  const server = application(f.store, config);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  config.origin = origin;
  const contexts = [];
  const errors = [];
  const pages = {};
  const evidence = [];
  mkdirSync(`artifacts/ui/${info.project.name}`, { recursive: true });
  async function signIn(name) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/login");
    await page.getByLabel("Username", { exact: true }).fill(name);
    await page
      .getByLabel("Password", { exact: true })
      .fill(f.credentials[name]);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    return page;
  }
  async function capture(page, name) {
    for (const width of [320, 390, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/ui/${info.project.name}/${name}-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} overflow at ${width}`,
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        audit.violations,
        JSON.stringify(
          audit.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      ).toEqual([]);
      const smallTargets = await page
        .locator("button:visible, .button:visible")
        .evaluateAll((nodes) =>
          nodes
            .filter((n) => n.getBoundingClientRect().height < 44)
            .map((n) => n.textContent),
        );
      expect(smallTargets).toEqual([]);
      evidence.push({ name, width, violations: audit.violations.length });
    }
  }
  try {
    pages.producer = await signIn("rowan");
    await expect(
      pages.producer.getByRole("heading", { name: "Make the story ready." }),
    ).toBeVisible();
    await capture(pages.producer, "studio-draft");
    await pages.producer
      .getByRole("button", { name: "Request content review", exact: true })
      .click();
    pages.approver = await signIn("ellis");
    await capture(pages.approver, "review-pending");
    await pages.approver
      .getByRole("button", { name: "Approve exact story version" })
      .click();
    await pages.approver
      .getByRole("button", { name: "Publish approved version" })
      .click();
    pages.facilitator = await signIn("mira");
    await capture(pages.facilitator, "briefing-home");
    await pages.facilitator
      .getByRole("link", { name: "Preview & details" })
      .click();
    await pages.facilitator
      .getByRole("button", { name: "Create participant link", exact: true })
      .click();
    const link = await pages.facilitator
      .getByLabel("Limited invitation URL")
      .inputValue();
    const participantContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    contexts.push(participantContext);
    pages.participant = await participantContext.newPage();
    await pages.participant.goto(link);
    await expect(
      pages.participant.getByRole("heading", {
        name: "Something changed with the tide.",
      }),
    ).toBeVisible();
    await pages.participant
      .getByRole("link", { name: /See my briefing details/ })
      .click();
    await expect(
      pages.participant.getByText("Read the illustrated teaser", {
        exact: true,
      }),
    ).toBeVisible();
    await capture(pages.participant, "invitation");
    await pages.participant.route("**/media/**", (route) => route.abort());
    await pages.participant.route("**/app.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.continue();
    });
    await pages.participant.reload();
    await expect(
      pages.participant.getByText("The shoreline is quiet.", { exact: false }),
    ).toBeVisible();
    await pages.participant.unroute("**/media/**");
    await pages.participant.unroute("**/app.js");
    await pages.participant.reload();
    // Keyboard can enter a native action; no role selector or frontend state grants access.
    await pages.participant.keyboard.press("Tab");
    expect(await pages.participant.locator(":focus").count()).toBe(1);
    await pages.facilitator.goto(origin + "/briefings");
    await pages.facilitator
      .getByRole("button", { name: "Start briefing", exact: true })
      .click();
    await capture(pages.facilitator, "runner");
    await pages.facilitator
      .getByRole("button", { name: "Next stage", exact: true })
      .click();
    await pages.facilitator
      .getByRole("button", { name: "Pause", exact: true })
      .click();
    await pages.facilitator.reload();
    await expect(
      pages.facilitator.getByRole("heading", { name: "KEEP", exact: true }),
    ).toBeVisible();
    await capture(pages.facilitator, "runner-paused");
    await expect(
      pages.facilitator.getByRole("button", {
        name: "Next stage",
        exact: true,
      }),
    ).toHaveCount(0);
    await pages.facilitator.context().setOffline(true);
    await expect(pages.facilitator.locator("#connection")).toContainText(
      "You are offline",
    );
    await pages.facilitator
      .getByRole("button", { name: "Resume briefing", exact: true })
      .click();
    expect(f.app.briefing("demo-briefing").state).toBe("PAUSED");
    await pages.facilitator.context().setOffline(false);
    await expect(pages.facilitator.locator("#connection")).toContainText(
      "Connection restored",
    );
    await pages.facilitator
      .getByRole("link", { name: "Reload saved state" })
      .click();
    await pages.facilitator
      .getByRole("button", { name: "Resume briefing", exact: true })
      .click();
    for (let i = 0; i < 3; i++) {
      await pages.facilitator
        .getByRole("button", { name: "Next stage", exact: true })
        .click();
    }
    await expect(
      pages.facilitator.getByRole("heading", {
        name: "Fictional reveal",
        exact: true,
      }),
    ).toBeVisible();
    await pages.facilitator
      .getByRole("button", { name: "Create safe-display link", exact: true })
      .click();
    const displayLink = await pages.facilitator
      .getByLabel("Limited invitation URL")
      .inputValue();
    const displayContext = await browser.newContext();
    contexts.push(displayContext);
    const display = await displayContext.newPage();
    await display.goto(displayLink);
    await expect(
      display.getByText("The fictional scene remains sealed", { exact: false }),
    ).toBeVisible();
    expect(await display.content()).not.toContain("Private prompts.");
    pages.investigator = await signIn("oren");
    await capture(pages.investigator, "desk-locked");
    await pages.facilitator.goto(origin + "/run/demo-briefing");
    await pages.facilitator.getByLabel("I intend to reveal").check();
    await pages.facilitator
      .getByRole("button", { name: "Confirm: reveal fictional clue" })
      .click();
    await capture(pages.facilitator, "runner-revealed");
    await display.reload();
    await expect(
      display.getByText("Maintenance slate · 21:40.", { exact: false }),
    ).toBeVisible();
    await pages.participant.reload();
    expect(await pages.participant.content()).not.toContain("Mara Vale");
    await pages.facilitator
      .getByRole("button", { name: "Next stage", exact: true })
      .click();
    await pages.facilitator
      .getByRole("button", { name: "Complete briefing", exact: true })
      .click();
    await capture(pages.facilitator, "runner-completed");
    await pages.investigator.reload();
    await expect(
      pages.investigator.getByText("No fictional evidence has been released", {
        exact: false,
      }),
    ).toBeVisible();
    await pages.producer.reload();
    await pages.producer
      .getByRole("button", { name: "Prepare fictional evidence" })
      .click();
    await pages.approver.reload();
    await pages.approver
      .getByRole("button", { name: "Approve exact evidence version" })
      .click();
    await pages.investigator.reload();
    await expect(
      pages.investigator.getByText("No fictional evidence has been released", {
        exact: false,
      }),
    ).toBeVisible();
    await pages.approver
      .getByRole("button", { name: "Release evidence to investigator" })
      .click();
    await pages.investigator.reload();
    await capture(pages.investigator, "desk-released");
    await pages.investigator
      .getByRole("link", { name: "Open printable evidence" })
      .click();
    await expect(
      pages.investigator.getByText("not sabotage", { exact: false }),
    ).toBeVisible();
    await pages.investigator.emulateMedia({ media: "print" });
    await expect(
      pages.investigator.getByRole("button", { name: "Print or save as PDF" }),
    ).toBeHidden();
    await pages.investigator.screenshot({
      path: `artifacts/ui/${info.project.name}/evidence-print.png`,
      fullPage: true,
    });
    await pages.facilitator.goto(origin + "/run/demo-briefing");
    await pages.facilitator
      .getByRole("button", { name: "Withdraw all links" })
      .click();
    await pages.participant.reload();
    await expect(
      pages.participant.getByRole("heading", {
        name: "This invitation has closed.",
      }),
    ).toBeVisible();
    await capture(pages.participant, "invitation-withdrawn");
    expect(errors).toEqual([]);
    writeFileSync(
      `artifacts/ui/${info.project.name}/results.json`,
      JSON.stringify(
        {
          checks: evidence,
          pageErrors: errors,
          deviceLimit:
            "Automated desktop engine emulation; no physical iPhone or VoiceOver.",
        },
        null,
        2,
      ),
    );
  } finally {
    for (const c of contexts) await c.close();
    await new Promise((r) => server.close(r));
    f.store.close();
  }
});

test("native keyboard sign-in and text-only invitation work without JavaScript", async ({
  browser,
}) => {
  const { publish, command } = await import("../helpers.mjs");
  const f = fixture();
  publish(f);
  const raw = command(f, "mira", "invite", "demo-briefing").issued;
  const config = { origin: "http://127.0.0.1", secure: false };
  const server = application(f.store, config);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  config.origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(config.origin + "/login");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Username", { exact: true })).toBeFocused();
    await page.keyboard.type("rowan");
    await page.keyboard.press("Tab");
    await page.keyboard.type(f.credentials.rowan);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Make the story ready." }),
    ).toBeVisible();
    await page.goto(config.origin + "/open");
    await page.getByLabel("Invitation credential").fill(raw);
    await page.getByRole("button", { name: "Open my invitation" }).click();
    await expect(
      page.getByRole("heading", { name: "Something changed with the tide." }),
    ).toBeVisible();
    await expect(
      page.getByText("Read the illustrated teaser", { exact: true }),
    ).toBeVisible();
    expect(await page.content()).not.toContain("Mara Vale");
  } finally {
    await context.close();
    await new Promise((r) => server.close(r));
    f.store.close();
  }
});
