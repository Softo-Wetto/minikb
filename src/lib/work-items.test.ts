import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

test("sorts open follow-ups ahead of completed items and by their due date", async () => {
  const moduleUrl = new URL("./work-items.ts", import.meta.url);
  assert.equal(existsSync(moduleUrl), true);
  if (!existsSync(moduleUrl)) return;

  const moduleUnderTest = await import("./work-items.ts") as unknown as {
    sortWorkItems?: unknown;
  };
  const sort = moduleUnderTest.sortWorkItems;

  assert.equal(typeof sort, "function");
  if (typeof sort !== "function") return;

  const items = [
    { id: "completed", status: "done", due_at: "2026-07-01" },
    { id: "undated", status: "open", due_at: null },
    { id: "later", status: "open", due_at: "2026-08-01" },
    { id: "overdue", status: "open", due_at: "2026-07-20" },
  ];

  assert.deepEqual(
    (sort as (value: typeof items, now?: Date) => typeof items)(
      items,
      new Date("2026-07-23T00:00:00.000Z")
    ).map((item) => item.id),
    ["overdue", "later", "undated", "completed"]
  );
});
