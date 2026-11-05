// SPDX-License-Identifier: AGPL-3.0-only
import { isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Store } from "./store.js";

export function runtimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const environment =
    env.CURRENT_ENV ??
    (env.NODE_ENV === "production" ? "production" : "development");
  if (
    !["development", "synthetic-staging", "production"].includes(environment) ||
    (env.NODE_ENV === "production" && environment !== "production")
  )
    throw new Error("Invalid or conflicting CURRENT_ENV / NODE_ENV.");
  const origin = env.CURRENT_ORIGIN ?? "http://127.0.0.1:3000";
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error(
      "CURRENT_ORIGIN must be an exact HTTP(S) origin without a path or credentials.",
    );
  const secure = url.protocol === "https:";
  if (
    !secure &&
    (environment !== "development" ||
      !["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw new Error("Staging and production require an explicit HTTPS origin.");
  const host = env.CURRENT_HOST ?? "127.0.0.1";
  if (host !== "127.0.0.1")
    throw new Error(
      "The listener must remain on 127.0.0.1 behind an approved private proxy.",
    );
  const portText = env.PORT ?? "3000";
  if (
    !/^\d+$/.test(portText) ||
    Number(portText) < 1 ||
    Number(portText) > 65535
  )
    throw new Error("PORT must be between 1 and 65535.");
  const database = env.CURRENT_DB ?? "data/current.sqlite";
  if (
    environment !== "development" &&
    (!env.CURRENT_DB || !isAbsolute(database) || !env.CURRENT_ORIGIN)
  )
    throw new Error(
      "Staging and production require explicit absolute CURRENT_DB and CURRENT_ORIGIN.",
    );
  return {
    environment,
    origin,
    secure,
    host,
    port: Number(portText),
    database,
  };
}

export function bindEnvironment(
  store: Store,
  config: ReturnType<typeof runtimeConfig>,
  initialize = false,
) {
  store.transaction(() => {
    const synthetic = store.get(
      "SELECT id FROM organizations WHERE id='demo-org'",
    );
    if (config.environment === "production" && synthetic)
      throw new Error("Synthetic demonstration is blocked in production mode.");
    if (
      config.environment === "synthetic-staging" &&
      (!synthetic ||
        store.get(
          "SELECT id FROM organizations WHERE id NOT IN ('demo-org','other-org')",
        ))
    )
      throw new Error(
        "Synthetic staging accepts only the original synthetic organizations.",
      );
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS runtime_context(id INTEGER PRIMARY KEY CHECK(id=1), environment TEXT NOT NULL, origin TEXT NOT NULL)",
    );
    const context = store.get<{ environment: string; origin: string }>(
      "SELECT environment,origin FROM runtime_context WHERE id=1",
    );
    if (!context) {
      if (!initialize && config.environment !== "development")
        throw new Error(
          "Unbound database. Provision a new isolated environment; do not reuse another environment's database.",
        );
      store.run(
        "INSERT INTO runtime_context VALUES(1,?,?)",
        config.environment,
        config.origin,
      );
    } else if (
      context.environment !== config.environment ||
      (config.environment !== "development" && context.origin !== config.origin)
    )
      throw new Error("Database environment/origin mismatch. Startup refused.");
  });
}

// Reject a wrong environment before Store can apply any migration to that DB.
export function preflightDatabase(config: ReturnType<typeof runtimeConfig>) {
  const db = new DatabaseSync(config.database, { readOnly: true });
  try {
    const synthetic = db
      .prepare("SELECT id FROM organizations WHERE id='demo-org'")
      .get();
    if (config.environment === "production" && synthetic)
      throw new Error("Synthetic demonstration is blocked in production mode.");
    if (
      config.environment === "synthetic-staging" &&
      (!synthetic ||
        db
          .prepare(
            "SELECT id FROM organizations WHERE id NOT IN ('demo-org','other-org')",
          )
          .get())
    )
      throw new Error(
        "Synthetic staging accepts only synthetic organizations.",
      );
    const hasContext = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='runtime_context'",
      )
      .get();
    const context = hasContext
      ? db
          .prepare("SELECT environment,origin FROM runtime_context WHERE id=1")
          .get()
      : undefined;
    if (
      (!context && config.environment !== "development") ||
      (context &&
        (context.environment !== config.environment ||
          (config.environment !== "development" &&
            context.origin !== config.origin)))
    )
      throw new Error(
        "Database environment/origin mismatch or unbound database. Startup refused before migration.",
      );
  } finally {
    db.close();
  }
}
