export function buildAttachmentFileFormData(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_name", file.name);
  formData.append("file_path", file.name);
  formData.append("file_size", String(file.size));
  formData.append("mime_type", file.type || "");
  return formData;
}

export function mergeReplacedAttachment<T extends { id: string }>(
  items: T[],
  replacement: T,
) {
  return items.map((item) =>
    item.id === replacement.id ? replacement : item,
  );
}
