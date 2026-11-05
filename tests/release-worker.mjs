// Separate OS process used only by the synthetic concurrency test.
import { Store } from "../dist/store.js";
import { Current } from "../dist/domain.js";
const [path, key] = process.argv.slice(2);
const store = new Store(path);
try {
  const result = new Current(store).command(
    { id: "ellis", csrf: "fixture" },
    "release",
    "demo-briefing",
    1,
    key,
  );
  console.log(JSON.stringify({ status: 200, repeated: result.repeated }));
} catch (error) {
  console.log(JSON.stringify({ status: error.status ?? 500 }));
} finally {
  store.close();
}
