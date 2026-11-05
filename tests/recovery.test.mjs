import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  fixture,
  publish,
  complete,
  release,
  actor,
  command,
} from "./helpers.mjs";
import { Store } from "../dist/store.js";
import { Current } from "../dist/domain.js";
test("migration replay, transaction rollback and live WAL snapshot restore retain exact released version", () => {
  const dir = mkdtempSync(join(tmpdir(), "current-restore-")),
    source = join(dir, "source.sqlite"),
    backup = join(dir, "backup.sqlite");
  const f = fixture(source);
  publish(f);
  complete(f);
  release(f);
  assert.throws(() =>
    f.store.transaction(() => {
      f.store.run("UPDATE grants SET revoked=1 WHERE user_id='oren'");
      throw Error("injected interruption");
    }),
  );
  assert.equal(f.app.investigator(actor("oren"), "quiet-buoy").length, 1);
  execFileSync(process.execPath, ["scripts/backup.mjs", source, backup]);
  assert.equal(statSync(backup).mode & 0o777, 0o600);
  command(f, "ellis", "revoke");
  assert.equal(
    f.app.investigator(actor("oren"), "quiet-buoy")[0].withdrawn,
    true,
  );
  f.store.close();
  const restored = new Store(backup);
  const app = new Current(restored);
  assert.equal(app.investigator(actor("oren"), "quiet-buoy")[0].version, 1);
  assert.equal(
    app.investigator(actor("oren"), "quiet-buoy")[0].withdrawn,
    false,
  );
  assert.equal(restored.get("SELECT count(*) n FROM migrations").n, 1);
  assert.equal(restored.get("SELECT count(*) n FROM approvals").n, 2);
  assert.throws(() =>
    execFileSync(process.execPath, ["scripts/backup.mjs", source, backup], {
      stdio: "pipe",
    }),
  );
  restored.close();
  rmSync(dir, { recursive: true });
});

test("separate concurrent Node processes serialize version/grant reads and release writes", async () => {
  const { spawn } = await import("node:child_process");
  const { token } = await import("../dist/store.js");
  const dir = mkdtempSync(join(tmpdir(), "current-race-"));
  const f = fixture(join(dir, "state.sqlite"));
  publish(f);
  complete(f);
  command(f, "rowan", "prepare", "demo-briefing");
  command(f, "ellis", "approve-evidence", "demo-briefing");
  const key = token();
  const run = (key) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        "tests/release-worker.mjs",
        join(dir, "state.sqlite"),
        key,
      ]);
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve(JSON.parse(out)) : reject(Error("worker failed")),
      );
    });
  try {
    const results = await Promise.all([run(key), run(key), run(token())]);
    assert.ok(results.some((r) => r.status === 200));
    assert.ok(results.some((r) => r.status === 409));
    assert.equal(f.store.get("SELECT count(*) n FROM releases").n, 1);
    assert.equal(
      f.store.get("SELECT count(*) n FROM audit WHERE action='release'").n,
      1,
    );
  } finally {
    f.store.close();
    rmSync(dir, { recursive: true });
  }
});
