import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
  chmodSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  runtimeConfig,
  bindEnvironment,
  preflightDatabase,
} from "../dist/config.js";
import { Store, token, now } from "../dist/store.js";
import { fixture, publish, command, complete, release } from "./helpers.mjs";

const cli = (args, env = {}) =>
  execFileSync(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
test("configuration rejects unsafe defaults, environment copies and changed staging origins", () => {
  const dir = mkdtempSync(join(tmpdir(), "current-env-"));
  const f = fixture(join(dir, "state.sqlite"));
  try {
    for (const env of [
      { CURRENT_ENV: "typo" },
      { PORT: "abc" },
      { PORT: "0" },
      { CURRENT_ORIGIN: "https://example.invalid/path" },
      { CURRENT_ORIGIN: "http://external.invalid" },
      { CURRENT_HOST: "0.0.0.0" },
      { CURRENT_ENV: "synthetic-staging" },
      { NODE_ENV: "production", CURRENT_ENV: "development" },
    ])
      assert.throws(() => runtimeConfig(env));
    const stage = runtimeConfig({
      CURRENT_ENV: "synthetic-staging",
      CURRENT_ORIGIN: "https://review.example.invalid",
      CURRENT_DB: join(dir, "state.sqlite"),
    });
    assert.throws(() => bindEnvironment(f.store, stage));
    bindEnvironment(f.store, stage, true);
    bindEnvironment(f.store, stage);
    assert.throws(() => bindEnvironment(f.store, runtimeConfig({})));
    assert.throws(() =>
      bindEnvironment(f.store, {
        ...stage,
        origin: "https://other.example.invalid",
      }),
    );
    assert.throws(() =>
      bindEnvironment(f.store, { ...stage, environment: "production" }),
    );
  } finally {
    f.store.close();
    rmSync(dir, { recursive: true });
  }
});

test("encrypted live-WAL backup authenticates data and restores access in quarantine", () => {
  const dir = mkdtempSync(join(tmpdir(), "current-crypto-"));
  const path = join(dir, "source.sqlite"),
    key = join(dir, "key"),
    backup = join(dir, "backup.current"),
    target = join(dir, "restored.sqlite");
  const f = fixture(path);
  try {
    publish(f);
    command(f, "mira", "invite", "demo-briefing");
    complete(f);
    release(f);
    f.store.run(
      "INSERT INTO logins VALUES(?,?,?,?)",
      token(),
      "mira",
      token(),
      now() + 100000,
    );
    cli(["scripts/recovery.mjs", "keygen", key]);
    cli(["scripts/recovery.mjs", "backup", path, backup, key]);
    assert.equal(statSync(backup).mode & 0o777, 0o600);
    assert.equal(
      readFileSync(backup).includes(Buffer.from("SQLite format")),
      false,
    );
    const bad = join(dir, "bad.current"),
      bytes = readFileSync(backup);
    bytes[bytes.length - 1] ^= 1;
    writeFileSync(bad, bytes, { mode: 0o600 });
    assert.throws(() =>
      cli(["scripts/recovery.mjs", "restore", bad, target, key]),
    );
    assert.equal(existsSync(target), false);
    const wrong = join(dir, "wrong");
    cli(["scripts/recovery.mjs", "keygen", wrong]);
    assert.throws(() =>
      cli(["scripts/recovery.mjs", "restore", backup, target, wrong]),
    );
    assert.equal(existsSync(target), false);
    cli(["scripts/recovery.mjs", "restore", backup, target, key]);
    const recovered = new Store(target);
    try {
      assert.equal(recovered.get("SELECT count(*) n FROM releases").n, 1);
      assert.equal(recovered.get("SELECT count(*) n FROM logins").n, 0);
      assert.equal(
        recovered.get("SELECT count(*) n FROM grants WHERE revoked=0").n,
        0,
      );
      assert.equal(
        recovered.get("SELECT count(*) n FROM invitations WHERE revoked=0").n,
        0,
      );
    } finally {
      recovered.close();
    }
    assert.throws(() =>
      cli(["scripts/recovery.mjs", "restore", backup, target, key]),
    );
    chmodSync(key, 0o644);
    assert.throws(() =>
      cli([
        "scripts/recovery.mjs",
        "backup",
        path,
        join(dir, "unsafe.current"),
        key,
      ]),
    );
    // A valid encryption envelope still must contain a healthy Current database.
    const corrupt = join(dir, "corrupt.sqlite");
    writeFileSync(corrupt, "not sqlite", { mode: 0o600 });
    assert.throws(() =>
      cli([
        "scripts/recovery.mjs",
        "backup",
        corrupt,
        join(dir, "corrupt.current"),
        wrong,
      ]),
    );
  } finally {
    f.store.close();
    rmSync(dir, { recursive: true });
  }
});

test("v1 upgrade preserves state, replays once and rejects checksum/schema drift", () => {
  const dir = mkdtempSync(join(tmpdir(), "current-migrate-")),
    path = join(dir, "state.sqlite");
  try {
    const v1 = new DatabaseSync(path);
    v1.exec(readFileSync("migrations/001-initial.sql", "utf8"));
    v1.exec(
      "INSERT INTO organizations VALUES('legacy','Synthetic migration fixture')",
    );
    v1.close();
    assert.throws(() =>
      preflightDatabase(
        runtimeConfig({
          CURRENT_ENV: "synthetic-staging",
          CURRENT_DB: path,
          CURRENT_ORIGIN: "https://review.example.invalid",
        }),
      ),
    );
    const untouched = new DatabaseSync(path, { readOnly: true });
    assert.equal(
      untouched.prepare("SELECT count(*) n FROM migrations").get().n,
      1,
    );
    untouched.close();
    const upgraded = new Store(path);
    assert.equal(upgraded.get("SELECT count(*) n FROM migrations").n, 2);
    assert.equal(
      upgraded.get("SELECT name FROM organizations WHERE id='legacy'").name,
      "Synthetic migration fixture",
    );
    upgraded.close();
    const replay = new Store(path);
    assert.equal(replay.get("SELECT count(*) n FROM migrations").n, 2);
    replay.run("UPDATE migration_integrity SET digest='wrong' WHERE version=2");
    replay.close();
    assert.throws(() => new Store(path), /checksum/);
    const unknown = new DatabaseSync(path);
    unknown.exec("INSERT INTO migrations VALUES(999)");
    unknown.close();
    assert.throws(() => new Store(path), /Unsupported/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

async function launch(env) {
  const child = spawn(process.execPath, ["dist/server.js"], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const exit = new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("startup timed out")), 10000);
    child.stdout.on("data", () => {
      if (output.includes("local listener")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(Error("startup refused"));
    });
  });
  return { child, exit, ready };
}

test("real CLI start, graceful shutdown, restart and wrong-path refusal preserve saved progress", async () => {
  const { createServer } = await import("node:net");
  const probe = createServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  const dir = mkdtempSync(join(tmpdir(), "current-start-")),
    path = join(dir, "state.sqlite");
  const env = {
    CURRENT_ENV: "development",
    NODE_ENV: "test",
    CURRENT_DB: path,
    CURRENT_HOST: "127.0.0.1",
    CURRENT_ORIGIN: `http://127.0.0.1:${port}`,
    PORT: String(port),
  };
  let active;
  try {
    assert.throws(() => cli(["dist/server.js"], env));
    assert.equal(existsSync(path), false);
    cli(["dist/seed.js"], env);
    assert.equal(
      statSync(join(dir, "demo-credentials.json")).mode & 0o777,
      0o600,
    );
    const db = new Store(path);
    const { Current } = await import("../dist/domain.js");
    const f = { store: db, app: new Current(db) };
    publish(f);
    command(f, "mira", "start", "demo-briefing");
    command(f, "mira", "next", "demo-briefing");
    command(f, "mira", "pause", "demo-briefing");
    db.close();
    for (let i = 0; i < 2; i++) {
      active = await launch(env);
      await active.ready;
      const response = await fetch(env.CURRENT_ORIGIN + "/health");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
      assert.match(response.headers.get("x-robots-tag"), /noindex/);
      active.child.kill("SIGTERM");
      assert.equal((await active.exit).code, 0);
      active = undefined;
      const reopened = new Store(path);
      assert.equal(reopened.get("SELECT stage FROM briefings").stage, 1);
      assert.equal(reopened.get("SELECT state FROM briefings").state, "PAUSED");
      reopened.close();
    }
    assert.throws(() => cli(["dist/seed.js"], env));
    assert.throws(() =>
      cli(["dist/server.js"], {
        ...env,
        CURRENT_ENV: "production",
        NODE_ENV: "production",
        CURRENT_ORIGIN: "https://review.example.invalid",
      }),
    );
  } finally {
    active?.child.kill("SIGKILL");
    rmSync(dir, { recursive: true });
  }
});
