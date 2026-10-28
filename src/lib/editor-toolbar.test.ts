import assert from "node:assert/strict";
import test from "node:test";
import { placeEditorPopover } from "./editor-toolbar.ts";

test("keeps a dropdown inside the viewport when its trigger is near the bottom right", () => {
  assert.deepEqual(placeEditorPopover(
    { left: 350, top: 400, bottom: 436 },
    { width: 280, height: 200 },
    { width: 390, height: 480 },
  ), { left: 102, top: 194, maxHeight: 386 });
});

test("constrains tall dropdowns to the available space below their trigger", () => {
  assert.deepEqual(placeEditorPopover(
    { left: 12, top: 72, bottom: 108 },
    { width: 288, height: 600 },
    { width: 320, height: 400 },
  ), { left: 12, top: 114, maxHeight: 278 });
});
