export function placeEditorPopover(
  anchor: { left: number; top: number; bottom: number },
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const margin = 8;
  const gap = 6;
  const below = Math.max(0, viewport.height - margin - anchor.bottom - gap);
  const above = Math.max(0, anchor.top - gap - margin);
  const opensAbove = panel.height > below && above > below;
  const maxHeight = opensAbove ? above : below;

  return {
    left: Math.max(margin, Math.min(anchor.left, viewport.width - panel.width - margin)),
    top: opensAbove
      ? Math.max(margin, anchor.top - gap - Math.min(panel.height, maxHeight))
      : Math.max(margin, anchor.bottom + gap),
    maxHeight,
  };
}
