// SPDX-License-Identifier: AGPL-3.0-only
import { DatabaseSync } from "node:sqlite";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

process.umask(0o077);
const [action, source, destination, keyPath] = process.argv.slice(2);
function privateParent(path) {
  const parent = dirname(resolve(path));
  if (realpathSync(parent) !== parent || lstatSync(parent).mode & 0o077)
    throw Error(
      "Use a real private directory (mode 0700) without symlink parents.",
    );
}
function newFile(path) {
  privateParent(path);
  if (existsSync(path))
    throw Error("Destination already exists; never overwrite recovery files.");
}
function privateFile(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
    throw Error("Recovery input must be a private regular file (mode 0600).");
}
function integrity(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    if (
      Object.values(db.prepare("PRAGMA integrity_check").get())[0] !== "ok" ||
      db.prepare("PRAGMA foreign_key_check").all().length
    )
      throw Error("Recovery database failed integrity checks.");
    if (!db.prepare("SELECT version FROM migrations WHERE version=1").get())
      throw Error("Not a Current database.");
  } finally {
    db.close();
  }
}
if (action === "keygen" && source && !destination) {
  newFile(source);
  writeFileSync(source, randomBytes(32), { flag: "wx", mode: 0o600 });
  console.log(
    "Recovery key created. Keep a separately secured copy; it is required to restore.",
  );
} else if (
  ["backup", "restore"].includes(action) &&
  source &&
  destination &&
  keyPath
) {
  newFile(destination);
  privateFile(source);
  privateFile(keyPath);
  const key = readFileSync(keyPath);
  if (key.length !== 32)
    throw Error("Recovery key must contain exactly 32 bytes.");
  const dir = mkdtempSync(resolve(tmpdir(), "current-recovery-"));
  chmodSync(dir, 0o700);
  const snapshot = resolve(dir, "snapshot.sqlite");
  try {
    if (action === "backup") {
      const db = new DatabaseSync(source, { readOnly: true });
      try {
        db.prepare("VACUUM INTO ?").run(snapshot);
      } finally {
        db.close();
      }
      integrity(snapshot);
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      const header = Buffer.from("CURRENT-BACKUP-1\n");
      cipher.setAAD(header);
      const encrypted = Buffer.concat([
        cipher.update(readFileSync(snapshot)),
        cipher.final(),
      ]);
      writeFileSync(
        destination,
        Buffer.concat([header, nonce, cipher.getAuthTag(), encrypted]),
        { flag: "wx", mode: 0o600 },
      );
      console.log(
        "Encrypted consistent snapshot created; database integrity and foreign keys checked.",
      );
    } else {
      const bytes = readFileSync(source);
      const header = Buffer.from("CURRENT-BACKUP-1\n");
      if (
        !bytes.subarray(0, header.length).equals(header) ||
        bytes.length < header.length + 28
      )
        throw Error("Unrecognized encrypted backup.");
      const offset = header.length;
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        bytes.subarray(offset, offset + 12),
      );
      decipher.setAAD(header);
      decipher.setAuthTag(bytes.subarray(offset + 12, offset + 28));
      const plain = Buffer.concat([
        decipher.update(bytes.subarray(offset + 28)),
        decipher.final(),
      ]);
      writeFileSync(snapshot, plain, { flag: "wx", mode: 0o600 });
      integrity(snapshot);
      const db = new DatabaseSync(snapshot);
      try {
        db.exec(
          "PRAGMA foreign_keys=ON; BEGIN IMMEDIATE; DELETE FROM logins; UPDATE invitations SET revoked=1; UPDATE grants SET revoked=1; DELETE FROM login_attempts; UPDATE briefings SET state='PAUSED',running_since=NULL,revision=revision+1 WHERE state='ACTIVE'; COMMIT;",
        );
      } finally {
        db.close();
      }
      integrity(snapshot);
      writeFileSync(destination, readFileSync(snapshot), {
        flag: "wx",
        mode: 0o600,
      });
      console.log(
        "Restored to a new database with all sessions removed, invitations revoked and grants quarantined. Reconcile current authority offline before any service restart.",
      );
    }
  } finally {
    key.fill(0);
    rmSync(dir, { recursive: true, force: true });
  }
} else
  throw Error(
    "Usage: node scripts/recovery.mjs keygen NEW_KEY | backup SOURCE.sqlite NEW_BACKUP KEY | restore BACKUP NEW.sqlite KEY",
  );
