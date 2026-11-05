// SPDX-License-Identifier: AGPL-3.0-only
// A narrow reproducible release guard, not a comprehensive secret/PII certification.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const bad = [];
for (const path of paths) {
  if (
    /(^|\/)(demo-credentials\.json|[^/]+\.(sqlite(?:-wal|-shm)?|current|key|pem))$/.test(
      path,
    ) ||
    (/(^|\/)\.env(?:\.|$)/.test(path) && path !== ".env.example")
  )
    bad.push(path);
  const content = readFileSync(path, "utf8");
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content) ||
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16})\b/.test(
      content,
    )
  )
    bad.push(path);
}
if (bad.length) {
  console.error(
    "Potential secret-bearing tracked paths:",
    [...new Set(bad)].join(", "),
  );
  process.exitCode = 1;
} else
  console.log(
    `Scoped secret guard: ${paths.length} tracked files; no matched credential files/private-key/provider-token signatures. Manual privacy review remains required.`,
  );
