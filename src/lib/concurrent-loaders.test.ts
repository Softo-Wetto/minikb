import assert from "node:assert/strict";
import test from "node:test";
import { runConcurrent, settleConcurrent } from "./concurrent-loaders.ts";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

test("starts every independent loader before any loader completes", async () => {

  const first = deferred<string>();
  const second = deferred<string>();
  const third = deferred<string>();
  const started: string[] = [];

  const pending = settleConcurrent([
    () => {
      started.push("first");
      return first.promise;
    },
    () => {
      started.push("second");
      return second.promise;
    },
    () => {
      started.push("third");
      return third.promise;
    },
  ] as const);

  await Promise.resolve();
  assert.deepEqual(started, ["first", "second", "third"]);

  first.resolve("one");
  second.resolve("two");
  third.resolve("three");
  await pending;
});

test("isolates rejected loaders while preserving fulfilled results", async () => {

  const failure = new Error("attachments unavailable");
  const results = await settleConcurrent([
    async () => ["article"],
    async () => {
      throw failure;
    },
    async () => ["company"],
  ] as const);

  assert.deepEqual(results, [
    { status: "fulfilled", value: ["article"] },
    { status: "rejected", reason: failure },
    { status: "fulfilled", value: ["company"] },
  ]);
});

test("starts every fail-fast loader before propagating a rejection", async () => {

  const failure = new Error("settings unavailable");
  const started: string[] = [];
  const pending = runConcurrent([
    async () => {
      started.push("folders");
      throw failure;
    },
    async () => {
      started.push("settings");
      return "ready";
    },
  ] as const);

  await Promise.resolve();
  assert.deepEqual(started, ["folders", "settings"]);
  await assert.rejects(pending, failure);
});
