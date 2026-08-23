import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAttachmentFileFormData,
  mergeReplacedAttachment,
} from "./attachment-files.ts";

test("builds complete replacement metadata from the selected file", () => {
  const file = new File(["replacement content"], "updated-runbook.pdf", {
    type: "application/pdf",
  });

  const formData = buildAttachmentFileFormData(file);

  assert.equal(formData.get("file"), file);
  assert.equal(formData.get("file_name"), "updated-runbook.pdf");
  assert.equal(formData.get("file_path"), "updated-runbook.pdf");
  assert.equal(formData.get("file_size"), "19");
  assert.equal(formData.get("mime_type"), "application/pdf");
});

test("keeps a replaced attachment in its existing list position", () => {
  const current = [
    { id: "first", file_name: "network-map.pdf" },
    { id: "target", file_name: "old-runbook.pdf" },
    { id: "last", file_name: "rack-photo.png" },
  ];
  const replacement = { id: "target", file_name: "new-runbook.pdf" };

  const next = mergeReplacedAttachment(current, replacement);

  assert.deepEqual(next, [current[0], replacement, current[2]]);
  assert.notEqual(next, current);
});
