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
