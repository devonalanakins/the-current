import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store, hash, token, now } from "../dist/store.js";
import {
  fixture,
  actor,
  command,
  publish,
  complete,
  release,
} from "./helpers.mjs";

test("complete persisted lifecycle requires distinct manual events and exact version", () => {
  const dir = mkdtempSync(join(tmpdir(), "current-"));
  const path = join(dir, "state.sqlite");
  const f = fixture(path);
  assert.throws(() => command(f, "mira", "start", "demo-briefing"));
  assert.throws(() => command(f, "rowan", "approve"));
  publish(f);
  const link = command(f, "mira", "invite", "demo-briefing", {
    audience: "participant",
  }).issued;
  assert.equal(
    f.store.get("SELECT token_hash FROM invitations").token_hash,
    hash(link),
  );
  const invitation = f.app.participant(link);
  assert.ok(!("clue" in invitation));
  assert.ok(!JSON.stringify(invitation).includes("Mara"));
  command(f, "mira", "start", "demo-briefing");
  command(f, "mira", "next", "demo-briefing");
  command(f, "mira", "pause", "demo-briefing");
  f.store.close();
  const resumed = new Store(path);
  f.store = resumed;
  f.app.store = resumed;
  assert.equal(f.app.briefing("demo-briefing").stage, 1);
  assert.equal(f.app.briefing("demo-briefing").state, "PAUSED");
  command(f, "mira", "resume", "demo-briefing");
  for (let i = 1; i < 4; i++) command(f, "mira", "next", "demo-briefing");
  assert.equal(f.app.briefing("demo-briefing").revealed, 0);
  assert.throws(() => command(f, "mira", "reveal", "demo-briefing"));
  command(f, "mira", "reveal", "demo-briefing", { confirm: "yes" });
  assert.equal(f.app.investigator(actor("oren"), "quiet-buoy").length, 0);
  command(f, "mira", "next", "demo-briefing");
  command(f, "mira", "complete", "demo-briefing");
  assert.equal(f.app.investigator(actor("oren"), "quiet-buoy").length, 0);
  assert.throws(() => command(f, "ellis", "release", "demo-briefing"));
  release(f);
  const records = f.app.investigator(actor("oren"), "quiet-buoy");
  assert.equal(records.length, 1);
  assert.equal(records[0].version, 1);
  assert.match(records[0].resolution, /not sabotage/);
  assert.throws(() =>
    command(f, "rowan", "edit", "1", {
      content: JSON.stringify({
        ...f.app.story(f.app.version(1)),
        title: "A silently swapped version",
      }),
    }),
  );
  command(f, "rowan", "fork");
  assert.equal(f.app.version(3).status, "DRAFT");
  assert.equal(f.app.briefing("demo-briefing").version, 1);
  assert.equal(f.app.investigator(actor("oren"), "quiet-buoy")[0].version, 1);
  for (const table of ["audit", "approvals", "releases"]) {
    assert.throws(() => f.store.run(`DELETE FROM ${table}`));
  }
  f.store.close();
  rmSync(dir, { recursive: true });
});
test("all audience and tenant boundaries deny direct media, draft previews and guessed scope", () => {
  const f = fixture();
  publish(f);
  const raw = command(f, "mira", "invite", "demo-briefing").issued;
  assert.throws(() => f.app.media(undefined, raw, 1, "clue"));
  assert.throws(() => f.app.media(actor("oren"), undefined, 1, "clue"));
  assert.throws(() => f.app.media(actor("outsider"), undefined, 1, "clue"));
  assert.throws(() => f.app.media(actor("mira"), undefined, 2, "shore"));
  assert.throws(() => f.app.investigator(actor("oren"), "other-campaign"));
  assert.throws(() => command(f, "rowan", "publish", "2"));
  assert.throws(() => command(f, "rowan", "start", "demo-briefing"));
  assert.throws(() => f.app.participant(token()));
  command(f, "mira", "revoke-invites", "demo-briefing");
  assert.throws(() => f.app.media(undefined, raw, 1, "shore"));
  f.store.close();
});
test("version-bound states, stale transitions, revocation, expiry and idempotency", () => {
  const f = fixture();
  publish(f);
  const rev = f.app.briefing("demo-briefing").revision,
    key = token();
  command(f, "mira", "start", "demo-briefing", {}, key, rev);
  assert.equal(
    command(f, "mira", "start", "demo-briefing", {}, key, rev).repeated,
    true,
  );
  assert.throws(() =>
    command(f, "mira", "next", "demo-briefing", {}, key, rev),
  );
  assert.throws(() =>
    command(f, "mira", "pause", "demo-briefing", {}, token(), rev),
  );
  f.store.run("UPDATE grants SET revoked=1 WHERE user_id='mira'");
  assert.throws(() => command(f, "mira", "pause", "demo-briefing"));
  f.store.run(
    "UPDATE grants SET revoked=0,expires=? WHERE user_id='mira'",
    now() - 1,
  );
  assert.throws(() => command(f, "mira", "pause", "demo-briefing"));
  f.store.close();
});
test("double release is idempotent, different concurrent keys cannot create two records", async () => {
  const f = fixture();
  publish(f);
  complete(f);
  command(f, "rowan", "prepare", "demo-briefing");
  command(f, "ellis", "approve-evidence", "demo-briefing");
  const rev = f.store.get("SELECT revision FROM evidence").revision;
  const key = token();
  const results = await Promise.allSettled([
    Promise.resolve().then(() =>
      command(f, "ellis", "release", "demo-briefing", {}, key, rev),
    ),
    Promise.resolve().then(() =>
      command(f, "ellis", "release", "demo-briefing", {}, key, rev),
    ),
    Promise.resolve().then(() =>
      command(f, "ellis", "release", "demo-briefing", {}, token(), rev),
    ),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "fulfilled");
  assert.equal(results[2].status, "rejected");
  assert.equal(f.store.get("SELECT count(*) n FROM releases").n, 1);
  f.store.close();
});
test("reviewed content is immutable; invalid content rolls back; timer never reveals", () => {
  const f = fixture();
  assert.throws(() => command(f, "rowan", "edit", "1", { content: "{" }));
  assert.equal(f.app.version(1).revision, 0);
  command(f, "rowan", "review");
  assert.throws(() =>
    f.store.run("UPDATE versions SET content=? WHERE id=1", "{}"),
  );
  command(f, "ellis", "changes");
  command(f, "rowan", "edit", "1", {
    content: JSON.stringify(f.app.story(f.app.version(1))),
  });
  command(f, "rowan", "review");
  command(f, "ellis", "approve");
  command(f, "ellis", "publish");
  command(f, "mira", "start", "demo-briefing");
  f.store.run("UPDATE briefings SET running_since=?", now() - 4 * 3600000);
  assert.equal(f.app.briefing("demo-briefing").revealed, 0);
  assert.equal(f.app.briefing("demo-briefing").stage, 0);
  assert.throws(() => command(f, "mira", "complete", "demo-briefing"));
  command(f, "ellis", "revoke");
  assert.throws(() => command(f, "mira", "next", "demo-briefing"));
  f.store.close();
});

test("new approved correction creates a separate rehearsal and preserves prior evidence", () => {
  const f = fixture();
  publish(f);
  complete(f);
  release(f);
  command(f, "rowan", "fork");
  const revised = {
    ...f.app.story(f.app.version(3)),
    evidence:
      "Correction: the listening window lasted twenty minutes. The original record used a rounded estimate. All of this remains fictional.",
  };
  command(f, "rowan", "edit", "3", { content: JSON.stringify(revised) });
  command(f, "rowan", "review", "3");
  command(f, "ellis", "approve", "3");
  command(f, "ellis", "publish", "3");
  command(f, "rowan", "assign", "3", { facilitator: "mira" });
  const id = f.store.get("SELECT id FROM briefings WHERE version=3").id;
  command(f, "mira", "start", id);
  for (let i = 0; i < 4; i++) command(f, "mira", "next", id);
  command(f, "mira", "reveal", id, { confirm: "yes" });
  command(f, "mira", "next", id);
  command(f, "mira", "complete", id);
  command(f, "rowan", "prepare", id);
  command(f, "ellis", "approve-evidence", id);
  command(f, "ellis", "release", id);
  const items = f.app.investigator(actor("oren"), "quiet-buoy");
  assert.equal(items.length, 2);
  assert.equal(items[0].version, 1);
  assert.equal(items[1].version, 2);
  assert.equal(items[1].supersedes, items[0].id);
  assert.equal(items[1].evidence, revised.evidence);
  f.store.close();
});

test("a contributor or evidence preparer cannot approve their own work after a role change", () => {
  const f = fixture();
  try {
    // A second producer edits a story originally authored by Rowan.
    f.store.run(
      "INSERT INTO grants VALUES('ellis','quiet-buoy','producer',?,0)",
      now() + 100000,
    );
    command(f, "ellis", "edit", "1", {
      content: JSON.stringify({
        ...f.app.story(f.app.version(1)),
        teaser: "An original revised synthetic teaser.",
      }),
    });
    command(f, "rowan", "review");
    f.store.run(
      "UPDATE grants SET revoked=1 WHERE user_id='ellis' AND role='producer'",
    );
    assert.throws(() => command(f, "ellis", "approve"), { status: 403 });
    assert.equal(f.app.version(1).status, "IN_REVIEW");
  } finally {
    f.store.close();
  }
  const g = fixture();
  try {
    publish(g);
    complete(g);
    g.store.run(
      "INSERT INTO grants VALUES('ellis','quiet-buoy','producer',?,0)",
      now() + 100000,
    );
    command(g, "ellis", "prepare", "demo-briefing");
    g.store.run(
      "UPDATE grants SET revoked=1 WHERE user_id='ellis' AND role='producer'",
    );
    assert.throws(
      () => command(g, "ellis", "approve-evidence", "demo-briefing"),
      { status: 403 },
    );
    assert.equal(
      g.store.get("SELECT state FROM evidence").state,
      "READY_FOR_REVIEW",
    );
    assert.equal(
      g.store.get("SELECT count(*) n FROM approvals WHERE scope='evidence'").n,
      0,
    );
  } finally {
    g.store.close();
  }
});

test("pause freezes progress and rejects navigation/completion until explicit resume", () => {
  const f = fixture();
  try {
    publish(f);
    command(f, "mira", "start", "demo-briefing");
    command(f, "mira", "pause", "demo-briefing");
    const before = f.app.briefing("demo-briefing");
    for (const action of ["next", "previous", "complete", "reveal"])
      assert.throws(
        () => command(f, "mira", action, "demo-briefing", { confirm: "yes" }),
        { status: 409 },
      );
    assert.deepEqual(f.app.briefing("demo-briefing"), before);
    command(f, "mira", "resume", "demo-briefing");
    command(f, "mira", "next", "demo-briefing");
    assert.equal(f.app.briefing("demo-briefing").stage, 1);
  } finally {
    f.store.close();
  }
});
