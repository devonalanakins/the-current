// SPDX-License-Identifier: AGPL-3.0-only
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const now = () => Date.now();
export const token = () => randomBytes(32).toString("base64url");
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function password(s: string) {
  const salt = token();
  return salt + ":" + scryptSync(s, salt, 64).toString("hex");
}
export function verifyPassword(s: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const actual = scryptSync(s, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:")
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY)",
    );
    const files = ["001-initial.sql", "002-evidence-preparer.sql"];
    this.transaction(() => {
      if (this.get("SELECT version FROM migrations WHERE version NOT IN (1,2)"))
        throw new Error(
          "Unsupported database schema. Use the matching application release.",
        );
      this.db.exec(
        "CREATE TABLE IF NOT EXISTS migration_integrity(version INTEGER PRIMARY KEY, digest TEXT NOT NULL)",
      );
      for (const [index, file] of files.entries()) {
        const version = index + 1;
        const sql = readFileSync("migrations/" + file, "utf8");
        const digest = hash(sql);
        const recorded = this.get<{ digest: string }>(
          "SELECT digest FROM migration_integrity WHERE version=?",
          version,
        );
        if (recorded && recorded.digest !== digest)
          throw new Error("Migration checksum mismatch.");
        if (
          !this.get("SELECT version FROM migrations WHERE version=?", version)
        )
          this.db.exec(sql);
        if (!recorded)
          this.run(
            "INSERT INTO migration_integrity VALUES(?,?)",
            version,
            digest,
          );
      }
    });
  }
  get<T>(sql: string, ...params: (string | number | null)[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }
  all<T>(sql: string, ...params: (string | number | null)[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }
  run(sql: string, ...params: (string | number | null)[]) {
    return this.db.prepare(sql).run(...params);
  }
  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const out = work();
      this.db.exec("COMMIT");
      return out;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
