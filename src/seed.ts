// SPDX-License-Identifier: AGPL-3.0-only
import { Store, password, token, now } from "./store.js";
import { Current } from "./domain.js";
import { story } from "./content.js";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { runtimeConfig, bindEnvironment } from "./config.js";
import { pathToFileURL } from "node:url";
export function seed(store: Store) {
  if (store.get("SELECT id FROM users LIMIT 1"))
    throw new Error(
      "Refusing to seed an existing database. Use a separate demo DB.",
    );
  const credentials: Record<string, string> = {};
  store.transaction(() => {
    store.run(
      "INSERT INTO organizations VALUES('demo-org','Larkspur Reach · synthetic'),('other-org','Other synthetic organization')",
    );
    store.run(
      "INSERT INTO campaigns VALUES('quiet-buoy','demo-org','Demo 000 — The Quiet Buoy'),('other-campaign','other-org','Isolation fixture')",
    );
    for (const [id, role] of [
      ["rowan", "producer"],
      ["ellis", "approver"],
      ["mira", "facilitator"],
      ["oren", "investigator"],
      ["outsider", "investigator"],
    ] as const) {
      const pass = token();
      credentials[id] = pass;
      store.run("INSERT INTO users VALUES(?,?,?)", id, id, password(pass));
      store.run(
        "INSERT INTO grants(user_id,campaign,role,expires) VALUES(?,?,?,?)",
        id,
        id === "outsider" ? "other-campaign" : "quiet-buoy",
        role,
        now() + 30 * 86400000,
      );
    }
    store.run(
      "INSERT INTO versions(id,campaign,number,status,content,author) VALUES(1,'quiet-buoy',1,'DRAFT',?,'rowan'),(2,'other-campaign',1,'DRAFT',?,'rowan')",
      JSON.stringify(story),
      JSON.stringify({ ...story, title: "Other campaign story" }),
    );
    store.run(
      "INSERT INTO briefings(id,campaign,version,facilitator) VALUES('demo-briefing','quiet-buoy',1,'mira')",
    );
    const app = new Current(store);
    app.updateAssets(1);
    app.updateAssets(2);
  });
  return credentials;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Synthetic seed is disabled in production.");
  process.umask(0o077);
  const config = runtimeConfig();
  if (config.environment === "production")
    throw new Error("Synthetic seed is disabled in production.");
  const handoff = join(dirname(config.database), "demo-credentials.json");
  if (existsSync(handoff) || existsSync(config.database))
    throw new Error(
      "Move the existing private credential handoff file before seeding a new database.",
    );
  mkdirSync(dirname(config.database), { recursive: true, mode: 0o700 });
  const db = new Store(config.database);
  const credentials = seed(db);
  bindEnvironment(db, config, true);
  db.close();
  writeFileSync(handoff, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  console.log(
    "Seeded synthetic draft campaign. Private credentials are beside the database in demo-credentials.json. No invitation was sent or approved.",
  );
}
