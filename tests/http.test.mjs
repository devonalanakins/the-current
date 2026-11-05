import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  listen,
  Client,
  command,
  publish,
  complete,
} from "./helpers.mjs";
import { hash, now, token } from "../dist/store.js";

test("actual HTTP rejects all twelve critical access bypasses and safe exports", async () => {
  const f = fixture();
  publish(f);
  const host = await listen(f);
  try {
    const participant = new Client(host.origin),
      facilitator = new Client(host.origin),
      investigator = new Client(host.origin),
      producer = new Client(host.origin),
      outsider = new Client(host.origin);
    const raw = command(f, "mira", "invite", "demo-briefing").issued;
    assert.equal((await participant.invite(raw)).status, 303);
    for (const [c, name] of [
      [facilitator, "mira"],
      [investigator, "oren"],
      [producer, "rowan"],
      [outsider, "outsider"],
    ])
      assert.equal((await c.login(name, f.credentials[name])).status, 303);
    for (const path of [
      "/run/demo-briefing",
      "/api/briefings/demo-briefing",
      "/studio",
      "/review",
      "/preview/1/facilitator",
      "/api/evidence",
      "/media/1/clue",
      "/media/2/shore",
      "/src/content.ts",
      "/dist/content.js",
      "/data/current.sqlite",
    ])
      assert.ok((await participant.request(path)).status >= 400, path);
    assert.equal((await new Client(host.origin).invite(token())).status, 410);
    const safe = await (await participant.request("/api/invitation")).text();
    assert.doesNotMatch(
      safe,
      /Mara|maintenance page was filed|prompts|resolution|facilitator/i,
    );
    assert.deepEqual(
      await (await investigator.request("/api/evidence")).json(),
      [],
    );
    for (const path of [
      "/media/1/clue",
      "/media/2/clue",
      "/preview/1/investigator",
      "/export/1",
      "/api/evidence?campaign=other-campaign",
      "/run/demo-briefing",
    ])
      assert.ok((await investigator.request(path)).status >= 400, path);
    const prodHtml = await (await producer.request("/studio")).text();
    const csrf = prodHtml.match(/name="csrf" value="([^"]+)"/)[1];
    assert.equal(
      (
        await producer.post("/action", {
          csrf,
          action: "approve",
          id: "1",
          revision: "0",
          key: token(),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await participant.post("/action", {
          csrf,
          action: "release",
          id: "demo-briefing",
          revision: "0",
          key: token(),
          role: "approver",
        })
      ).status,
      401,
    );
    const image = await participant.request("/media/1/shore");
    assert.equal(image.status, 200);
    assert.match(image.headers.get("cache-control"), /no-store/);
    assert.equal(image.headers.get("etag"), null);
    command(f, "mira", "revoke-invites", "demo-briefing");
    assert.equal(
      (
        await participant.request("/media/1/shore", {
          headers: { "If-None-Match": "anything" },
        })
      ).status,
      410,
    );
    assert.equal((await participant.request("/invitation")).status, 410);
    complete(f);
    command(f, "rowan", "prepare", "demo-briefing");
    command(f, "ellis", "approve-evidence", "demo-briefing");
    const approver = new Client(host.origin);
    await approver.login("ellis", f.credentials.ellis);
    const reviewHtml = await (await approver.request("/review")).text();
    const releaseCsrf = reviewHtml.match(/name="csrf" value="([^"]+)"/)[1];
    const data = {
      csrf: releaseCsrf,
      action: "release",
      id: "demo-briefing",
      revision: f.store.get("SELECT revision FROM evidence").revision,
      key: token(),
    };
    const concurrent = await Promise.all([
      approver.post("/action", data),
      approver.post("/action", data),
      approver.post("/action", { ...data, key: token() }),
    ]);
    assert.deepEqual(
      concurrent.map((r) => r.status),
      [303, 303, 409],
    );
    const items = await (await investigator.request("/api/evidence")).json();
    assert.equal(items.length, 1);
    const exported = await (await investigator.request("/export/1")).text();
    assert.doesNotMatch(
      exported,
      /mira|rowan|ellis|demo-briefing|private prompts|username|scheduled/i,
    );
    assert.match(exported, /not sabotage/);
    assert.equal((await investigator.request("/media/1/clue")).status, 200);
    assert.ok((await outsider.request("/media/1/clue")).status >= 400);
    assert.ok((await outsider.request("/export/1")).status >= 400);
    f.store.run("UPDATE grants SET revoked=1 WHERE user_id='oren'");
    assert.ok((await investigator.request("/media/1/clue")).status >= 400);
    assert.ok((await investigator.request("/export/1")).status >= 400);
    assert.equal(f.store.get("SELECT count(*) n FROM releases").n, 1);
  } finally {
    await host.close();
    f.store.close();
  }
});
test("login, CSRF, expiry, presentation separation, escaping and resource limits", async () => {
  const f = fixture();
  publish(f);
  const host = await listen(f);
  try {
    const c = new Client(host.origin);
    const raw = command(f, "mira", "invite", "demo-briefing").issued;
    assert.equal(
      (await c.post("/open", { csrf: "wrong", token: raw })).status,
      403,
    );
    assert.equal((await c.invite(raw)).status, 303);
    assert.equal((await c.request("/presentation")).status, 410);
    f.store.run(
      "UPDATE invitations SET expires=? WHERE token_hash=?",
      now() - 1,
      hash(raw),
    );
    assert.equal((await c.request("/media/1/shore")).status, 410);
    const p = new Client(host.origin);
    assert.equal((await p.login("mira", "incorrect")).status, 401);
    assert.equal((await p.login("mira", f.credentials.mira)).status, 303);
    const b = f.app.briefing("demo-briefing");
    assert.equal(
      (
        await p.post("/action", {
          csrf: "bad",
          action: "start",
          id: b.id,
          revision: b.revision,
          key: token(),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await p.request("/logout", {
          method: "POST",
          headers: {
            Origin: "https://evil.invalid",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "csrf=bad",
        })
      ).status,
      403,
    );
    const html = await (await p.request("/run/demo-briefing")).text();
    const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
    const action = {
      csrf,
      action: "start",
      id: b.id,
      revision: b.revision,
      key: token(),
    };
    const both = await Promise.all([
      p.post("/action", action),
      p.post("/action", action),
    ]);
    assert.deepEqual(
      both.map((r) => r.status),
      [303, 303],
    );
    assert.equal(
      (
        await p.post("/action", {
          csrf,
          action: "next",
          id: b.id,
          revision: b.revision,
          key: token(),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await p.request("/action", {
          method: "POST",
          headers: {
            Origin: "http://127.0.0.1:3000",
            "Content-Type": "application/json",
          },
          body: "{}",
        })
      ).status,
      415,
    );
    assert.equal(
      (await p.post("/action", { padding: "x".repeat(65000) })).status,
      413,
    );
    const draft = structuredClone(f.app.story(f.app.version(1)));
    draft.title = '<script>alert("xss")</script>Original title';
    command(f, "rowan", "fork");
    command(f, "rowan", "edit", "3", { content: JSON.stringify(draft) });
    const producer = new Client(host.origin);
    await producer.login("rowan", f.credentials.rowan);
    const preview = await (
      await producer.request("/preview/3/participant")
    ).text();
    assert.ok(preview.includes("&lt;script&gt;"));
    assert.ok(!preview.includes("<script>alert"));
    const r = await p.request("/workspace");
    assert.match(
      r.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    assert.equal(r.headers.get("referrer-policy"), "same-origin");
    f.store.run("UPDATE logins SET expires=?", now() - 1);
    assert.equal((await p.request("/run/demo-briefing")).status, 401);
  } finally {
    await host.close();
    f.store.close();
  }
});

test("secure-mode session cookie flags and live facilitator grant revocation", async () => {
  const f = fixture();
  publish(f);
  const { application } = await import("../dist/server.js");
  const server = application(f.store, {
    origin: "https://current.test",
    secure: true,
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const start = await fetch(base + "/login");
    const html = await start.text();
    const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
    const preflight = start.headers.getSetCookie()[0].split(";")[0];
    const login = await fetch(base + "/login", {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: "https://current.test",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: preflight,
      },
      body: new URLSearchParams({
        username: "mira",
        password: f.credentials.mira,
        csrf,
      }),
    });
    assert.equal(login.status, 303);
    const cookie = login.headers
      .getSetCookie()
      .find((c) => c.startsWith("current="));
    for (const flag of ["HttpOnly", "SameSite=Strict", "Secure", "Path=/"])
      assert.ok(cookie.includes(flag));
    assert.match(login.headers.get("strict-transport-security"), /max-age/);
    const auth = cookie.split(";")[0];
    assert.equal(
      (await fetch(base + "/run/demo-briefing", { headers: { Cookie: auth } }))
        .status,
      200,
    );
    f.store.run("UPDATE grants SET revoked=1 WHERE user_id='mira'");
    assert.equal(
      (await fetch(base + "/run/demo-briefing", { headers: { Cookie: auth } }))
        .status,
      404,
    );
    assert.equal(
      (await fetch(base + "/media/1/shore", { headers: { Cookie: auth } }))
        .status,
      404,
    );
  } finally {
    await new Promise((r) => server.close(r));
    f.store.close();
  }
});
