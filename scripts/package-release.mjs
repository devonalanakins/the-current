// SPDX-License-Identifier: AGPL-3.0-only
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  cpSync,
  writeFileSync,
  existsSync,
  rmSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";
const output = process.argv[2];
if (!output || existsSync(output))
  throw Error("Provide a new release directory.");
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim())
  throw Error("Commit the tested source before packaging.");
// Rebuild generated output from scratch; never ship stale or ignored source files.
rmSync("dist", { recursive: true, force: true });
execFileSync("npm", ["run", "build"], { stdio: "inherit" });
mkdirSync(output, { recursive: true, mode: 0o700 });
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
for (const path of paths) {
  mkdirSync(dirname(resolve(output, path)), { recursive: true });
  cpSync(path, resolve(output, path));
}
cpSync("dist", resolve(output, "dist"), { recursive: true });
writeFileSync(resolve(output, "SOURCE_COMMIT"), sha + "\n");
const manifest = [];
function scan(dir, prefix = "") {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) scan(join(dir, entry.name), path + "/");
    else
      manifest.push(
        createHash("sha256")
          .update(readFileSync(join(dir, entry.name)))
          .digest("hex") +
          "  " +
          path,
      );
  }
}
scan(output);
writeFileSync(resolve(output, "MANIFEST.sha256"), manifest.join("\n") + "\n");
console.log(
  "Portable release prepared from committed tracked source and a clean build; no ignored files/data/credentials or node_modules included. Verify MANIFEST.sha256 before installation.",
);
