"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { BulletList, OrderedList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookMarked,
  Captions,
  ChevronDown,
  CircleCheck,
  CircleSlash,
  Code,
  Columns3,
  ExternalLink,
  Highlighter,
  Image as ImageIcon,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Maximize2,
  Minus,
  PanelTop,
  Quote,
  Redo2,
  RemoveFormatting,
  RotateCcw,
  Rows3,
  Search,
  ShieldAlert,
  SquareCode,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  TableCellsMerge,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  TriangleAlert,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  Upload,
  Type,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  articleOptions?: Array<{ id: string; title: string }>;
};

const TEXT_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Slate", value: "#cbd5e1" },
  { label: "Orange", value: "#fb923c" },
  { label: "Amber", value: "#facc15" },
  { label: "Green", value: "#4ade80" },
  { label: "Blue", value: "#60a5fa" },
  { label: "Purple", value: "#c084fc" },
  { label: "Pink", value: "#f472b6" },
  { label: "Red", value: "#f87171" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fde68a" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Purple", value: "#ddd6fe" },
  { label: "Pink", value: "#fbcfe8" },
];

const ORDERED_LIST_STYLES = [
  { label: "1, 2, 3", value: "decimal" },
  { label: "A, B, C", value: "upper-alpha" },
  { label: "a, b, c", value: "lower-alpha" },
  { label: "I, II, III", value: "upper-roman" },
  { label: "i, ii, iii", value: "lower-roman" },
];

const BULLET_LIST_STYLES = [
  { label: "Disc", value: "disc" },
  { label: "Circle", value: "circle" },
  { label: "Square", value: "square" },
];

const HEADING_OPTIONS = [
  { label: "Paragraph", value: "paragraph", description: "Normal text" },
  { label: "H1", value: "1", description: "Page heading" },
  { label: "H2", value: "2", description: "Section heading" },
  { label: "H3", value: "3", description: "Subsection heading" },
  { label: "H4", value: "4", description: "Small heading" },
  { label: "H5", value: "5", description: "Tiny heading" },
] as const;

const ALIGN_OPTIONS = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align center", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
  { value: "justify", label: "Justify", icon: AlignJustify },
] as const;

type HeadingValue = (typeof HEADING_OPTIONS)[number]["value"];
type AlignValue = (typeof ALIGN_OPTIONS)[number]["value"];
/** Each value needs a matching `.kb-callout-<type>` rule in globals.css. */
type CalloutType = "info" | "success" | "warning" | "danger";

type ColorOption = {
  label: string;
  value: string;
};

type ImageAlign = "left" | "center" | "right";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the current block in a callout. */
      setCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      /** Wrap, switch type, or unwrap depending on the current selection. */
      toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      /** Unwrap the callout around the current selection. */
      unsetCallout: () => ReturnType;
    };
  }
}

function normalizeImageAlign(value: unknown): ImageAlign {
  return value === "left" || value === "right" || value === "center"
    ? value
    : "center";
}

function ResizableImageView({
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [resizing, setResizing] = useState(false);
  const attrs = node.attrs as {
    src: string;
    alt?: string | null;
    title?: string | null;
    width?: string | null;
    align?: ImageAlign | null;
  };
  const align = normalizeImageAlign(attrs.align);
  const width = attrs.width || null;
  const numericWidth = width?.match(/^(\d+(?:\.\d+)?)%$/)?.[1] || null;
  const sliderValue = numericWidth ? Number(numericWidth) : width === "100%" ? 100 : 50;

  function selectNode() {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (typeof pos === "number") {
      editor.commands.setNodeSelection(pos);
    }
  }

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    selectNode();

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const startX = event.clientX;
    const startWidth = wrapper.getBoundingClientRect().width;
    const editorWidth = wrapper.closest(".tiptap")?.getBoundingClientRect().width || startWidth;

    setResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const delta = moveEvent.clientX - startX;
      // Store a percentage so images stay responsive and the slider stays in sync.
      const percent = ((startWidth + delta) / editorWidth) * 100;
      updateAttributes({ width: `${Math.round(Math.max(15, Math.min(100, percent)))}%` });
    };

    const stopResize = () => {
      setResizing(false);
      document.body.classList.remove("kb-image-resizing");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    document.body.classList.add("kb-image-resizing");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  return (
    <NodeViewWrapper
      as="figure"
      ref={wrapperRef}
      data-resizable-image
      data-align={align}
      data-sized={width ? "true" : "false"}
      className={`kb-editor-image ${selected || resizing ? "is-selected" : ""}`}
      style={width ? { width } : undefined}
      contentEditable={false}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        selectNode();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attrs.src}
        alt={attrs.alt || ""}
        title={attrs.title || ""}
        draggable="false"
      />

      {(selected || resizing) && (
        <>
          <div className="kb-editor-image-toolbar" data-image-control>
            <button
              type="button"
              title="Align left"
              className={align === "left" ? "is-active" : ""}
              onClick={() => updateAttributes({ align: "left" })}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Align center"
              className={align === "center" ? "is-active" : ""}
              onClick={() => updateAttributes({ align: "center" })}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Align right"
              className={align === "right" ? "is-active" : ""}
              onClick={() => updateAttributes({ align: "right" })}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Natural size"
              onClick={() => updateAttributes({ width: null })}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Full width"
              onClick={() => updateAttributes({ width: "100%" })}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Small image" onClick={() => updateAttributes({ width: "35%" })}>
              S
            </button>
            <button type="button" title="Medium image" onClick={() => updateAttributes({ width: "60%" })}>
              M
            </button>
            <button type="button" title="Large image" onClick={() => updateAttributes({ width: "80%" })}>
              L
            </button>
            <label className="kb-editor-image-slider" title="Image width">
              <span>{Math.round(sliderValue)}%</span>
              <input
                type="range"
                min="20"
                max="100"
                value={sliderValue}
                onChange={(event) => updateAttributes({ width: `${event.target.value}%` })}
              />
            </label>
            <button
              type="button"
              title="Alt text"
              onClick={() => {
                const alt = window.prompt("Image alt text", attrs.alt || "");
                if (alt !== null) updateAttributes({ alt });
              }}
            >
              <Captions className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Delete image"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div
            data-image-control
            title="Resize image"
            className="kb-editor-image-resize"
            onPointerDown={startResize}
          />
        </>
      )}
    </NodeViewWrapper>
  );
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          element.style.width || element.getAttribute("width") || null,
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => ({
          "data-align": normalizeImageAlign(attributes.align),
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    // `width`/`style` are rebuilt below so the serialized markup never ends up
    // with a duplicated (and for percentages, invalid) width attribute.
    const { width, style, ...rest } = HTMLAttributes as Record<string, string>;
    const resolvedWidth = width || style?.match(/width:\s*([^;]+)/)?.[1] || null;

    return [
      "img",
      mergeAttributes(rest, {
        "data-align": normalizeImageAlign(rest["data-align"]),
        style: resolvedWidth
          ? `width: ${resolvedWidth}; max-width: 100%; height: auto;`
          : "max-width: 100%; height: auto;",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView, {
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return !!target?.closest("[data-image-control]");
      },
    });
  },
});

const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: "decimal",
        parseHTML: (element) =>
          element.getAttribute("data-list-style") ||
          element.style.listStyleType ||
          "decimal",
        renderHTML: (attributes) => ({
          "data-list-style": attributes.listStyle || "decimal",
          style: `list-style-type: ${attributes.listStyle || "decimal"};`,
        }),
      },
    };
  },
});

const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: "disc",
        parseHTML: (element) =>
          element.getAttribute("data-list-style") ||
          element.style.listStyleType ||
          "disc",
        renderHTML: (attributes) => ({
          "data-list-style": attributes.listStyle || "disc",
          style: `list-style-type: ${attributes.listStyle || "disc"};`,
        }),
      },
    };
  },
});

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-callout-type") || "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type || "info",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes["data-callout-type"] || "info";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: `kb-callout kb-callout-${type}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attributes),

      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),

      toggleCallout:
        (attributes) =>
        ({ commands, editor }) => {
          if (!editor.isActive(this.name)) {
            return commands.wrapIn(this.name, attributes);
          }
          if (attributes?.type && editor.getAttributes(this.name).type !== attributes.type) {
            return commands.updateAttributes(this.name, attributes);
          }
          return commands.lift(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": () => this.editor.commands.toggleCallout({ type: "info" }),
      // Escape a callout without having to reach for the mouse.
      "Mod-Enter": () => {
        const { $from } = this.editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name === this.name) {
            const after = $from.after(depth);
            return this.editor
              .chain()
              .insertContentAt(after, { type: "paragraph" })
              .setTextSelection(after + 1)
              .focus()
              .run();
          }
        }
        return false;
      },
    };
  },
});

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Keep the editor selection intact when the toolbar is clicked.
      onMouseDown={(event) => event.preventDefault()}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "bg-orange-500/20 text-orange-100 ring-1 ring-inset ring-orange-400/40"
          : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-zinc-800" />;
}

function MenuItem({
  onClick,
  active,
  disabled,
  children,
  hint,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "bg-orange-500/15 text-orange-100"
          : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">{children}</span>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </button>
  );
}

/**
 * Dropdown panel rendered into a portal.
 *
 * The toolbar is a sticky, horizontally constrained strip, so an absolutely
 * positioned panel gets clipped by its scroll/overflow context and looks like
 * "nothing opens". Portalling to <body> with fixed coordinates avoids that
 * entirely, and gives us outside-click/Escape handling in one place.
 */
function Popover({
  title,
  trigger,
  active,
  disabled,
  triggerClassName,
  panelClassName = "w-56",
  children,
}: {
  title: string;
  trigger: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  triggerClassName?: string;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const place = useCallback(() => {
    const anchor = triggerRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));
    const below = rect.bottom + 6;
    const top =
      below + panelHeight > window.innerHeight - 8 && rect.top - panelHeight - 6 > 8
        ? rect.top - panelHeight - 6
        : below;

    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as globalThis.Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          // Drop stale coordinates so a reopened panel is never painted at its
          // previous position before the layout effect re-measures it.
          setCoords(null);
          setOpen((value) => !value);
        }}
        className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
          active || open
            ? "bg-orange-500/20 text-orange-100 ring-1 ring-inset ring-orange-400/40"
            : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
        } ${triggerClassName || ""}`}
      >
        {trigger}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={title}
            style={{
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              visibility: coords ? "visible" : "hidden",
            }}
            className={`fixed z-[100] max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-2xl shadow-black/60 ${panelClassName}`}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
        )}
    </>
  );
}

function ColorPanel({
  colors,
  label,
  allowCustom,
  onClear,
  onSelect,
  swatchShape,
  close,
}: {
  colors: ColorOption[];
  label: string;
  allowCustom?: boolean;
  onClear: () => void;
  onSelect: (value: string) => void;
  swatchShape: string;
  close: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          onClear();
          close();
        }}
        className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
      >
        <CircleSlash className="h-3.5 w-3.5" />
        Clear {label.toLowerCase()}
      </button>
      <div className="grid grid-cols-3 gap-1.5">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            aria-label={color.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelect(color.value);
              close();
            }}
            className="flex items-center justify-center rounded-lg border border-zinc-800 p-2 transition hover:border-orange-300/60 hover:bg-zinc-900"
          >
            <span
              className={`h-5 w-5 border border-zinc-600 ${swatchShape}`}
              style={{ backgroundColor: color.value }}
            />
          </button>
        ))}
      </div>
      {allowCustom && (
        <label className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-800 px-2 py-1.5 text-xs font-semibold text-zinc-300">
          Custom
          <input
            type="color"
            onChange={(event) => onSelect(event.target.value)}
            className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
          />
        </label>
      )}
    </div>
  );
}

function LinkPanel({
  initialHref,
  onApply,
  onRemove,
  close,
}: {
  initialHref: string;
  onApply: (href: string) => void;
  onRemove: () => void;
  close: () => void;
}) {
  const [href, setHref] = useState(initialHref);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function apply() {
    const trimmed = href.trim();
    if (!trimmed) {
      onRemove();
    } else {
      onApply(trimmed);
    }
    close();
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        value={href}
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
        placeholder="https://example.com"
        aria-label="Link URL"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-orange-500/70"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={apply}
          className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400"
        >
          Apply
        </button>
        {initialHref && (
          <>
            <a
              href={initialHref}
              target="_blank"
              rel="noreferrer"
              title="Open link in a new tab"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              title="Remove link"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onRemove();
                close();
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:border-red-500/60 hover:text-red-200"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ArticleLinkPanel({
  articles,
  onSelect,
  close,
}: {
  articles: Array<{ id: string; title: string }>;
  onSelect: (id: string) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const term = query.trim().toLowerCase();
  const matches = term
    ? articles.filter((article) => article.title.toLowerCase().includes(term))
    : articles;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles"
          aria-label="Search articles"
          className="w-full bg-transparent text-sm text-white outline-none"
        />
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {matches.length === 0 && (
          <p className="px-2 py-3 text-xs text-zinc-500">No matching articles.</p>
        )}
        {matches.slice(0, 60).map((article) => (
          <button
            key={article.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelect(article.id);
              close();
            }}
            className="block w-full truncate rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {article.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImageUrlPanel({
  onInsertUrl,
  close,
}: {
  onInsertUrl: (url: string) => void;
  close: () => void;
}) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function insert() {
    if (!url.trim()) return;
    onInsertUrl(url.trim());
    close();
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          insert();
        }}
        placeholder="https://example.com/diagram.png"
        aria-label="Image URL"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-orange-500/70"
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={insert}
        className="w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400"
      >
        Insert image
      </button>
      <p className="px-1 text-[11px] leading-snug text-zinc-500">
        You can also paste or drag an image straight into the document.
      </p>
    </div>
  );
}

/** Everything the toolbar needs to render, derived from the editor's state. */
function readToolbarState(editor: Editor) {
  const heading: HeadingValue =
    (([1, 2, 3, 4, 5] as const)
      .find((level) => editor.isActive("heading", { level }))
      ?.toString() as HeadingValue | undefined) ?? "paragraph";

  const align: AlignValue =
    ALIGN_OPTIONS.find((option) => editor.isActive({ textAlign: option.value }))?.value || "left";

  return {
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    heading,
    align,
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    code: editor.isActive("code"),
    codeBlock: editor.isActive("codeBlock"),
    subscript: editor.isActive("subscript"),
    superscript: editor.isActive("superscript"),
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    taskList: editor.isActive("taskList"),
    blockquote: editor.isActive("blockquote"),
    bulletStyle: (editor.getAttributes("bulletList").listStyle as string) || "disc",
    orderedStyle: (editor.getAttributes("orderedList").listStyle as string) || "decimal",
    link: editor.isActive("link"),
    linkHref: (editor.getAttributes("link").href as string) || "",
    textColor: (editor.getAttributes("textStyle").color as string) || null,
    highlight: editor.isActive("highlight"),
    calloutType: editor.isActive("callout")
      ? (editor.getAttributes("callout").type as string) || "info"
      : null,
    inTable: editor.isActive("table"),
    words: editor.storage.characterCount?.words() ?? 0,
    characters: editor.storage.characterCount?.characters() ?? 0,
  };
}

export default function RichTextEditor({ value, onChange, articleOptions = [] }: Props) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5],
        },
        link: false,
        underline: false,
        bulletList: false,
        orderedList: false,
      }),
      StyledBulletList,
      StyledOrderedList,
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      TextStyle,
      Color,
      CharacterCount,
      Placeholder.configure({
        placeholder: "Start writing your documentation…",
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      ResizableImage.configure({
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "tiptap min-h-[520px] w-full outline-none px-4 py-4 text-white",
      },
      handlePaste(view, event) {
        return insertImageFiles(view, Array.from(event.clipboardData?.files || []), event);
      },
      handleDrop(view, event) {
        const dragEvent = event as DragEvent;
        return insertImageFiles(
          view,
          Array.from(dragEvent.dataTransfer?.files || []),
          dragEvent,
          dragEvent
        );
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? readToolbarState(editor) : null),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded border border-zinc-800 bg-black p-4 text-zinc-400">
        Loading editor...
      </div>
    );
  }

  // useEditorState caches the snapshot it took when `editor` was still null and
  // only refreshes it on the editor's first `transaction` event. Rendering must
  // never wait on that: EditorContent has to mount before any transaction can
  // fire, so gating on it would deadlock. Read straight from the editor until
  // the store catches up.
  const state = editorState ?? readToolbarState(editor);

  const safeEditor = editor;

  function applyLink(href: string) {
    safeEditor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  function removeLink() {
    safeEditor.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  function insertArticleLink(articleId: string) {
    const article = articleOptions.find((option) => option.id === articleId);
    if (!article) return;

    const href = `/articles/${article.id}`;

    // Turn an existing selection into the link instead of dropping the title on top of it.
    if (!safeEditor.state.selection.empty) {
      applyLink(href);
      return;
    }

    safeEditor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: article.title,
        marks: [{ type: "link", attrs: { href } }],
      })
      .run();
  }

  function addImageUrl(url: string) {
    safeEditor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: url,
          align: "center",
        },
      })
      .run();
  }

  function addImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      safeEditor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: reader.result,
            alt: file.name,
            title: file.name,
            align: "center",
            width: "60%",
          },
        })
        .run();
    };
    reader.readAsDataURL(file);
  }

  function setHeadingValue(value: HeadingValue) {
    if (value === "paragraph") {
      safeEditor.chain().focus().setParagraph().run();
      return;
    }

    const level = Number(value) as 1 | 2 | 3 | 4 | 5;

    if (safeEditor.isActive("heading", { level })) {
      safeEditor.chain().focus().setParagraph().run();
      return;
    }

    safeEditor.chain().focus().setHeading({ level }).run();
  }

  function setListStyle(kind: "bulletList" | "orderedList", style: string) {
    const chain = safeEditor.chain().focus();
    if (!safeEditor.isActive(kind)) {
      if (kind === "bulletList") chain.toggleBulletList();
      else chain.toggleOrderedList();
    }
    chain.updateAttributes(kind, { listStyle: style }).run();
  }

  const activeHeadingLabel =
    HEADING_OPTIONS.find((option) => option.value === state.heading)?.label || "Paragraph";

  return (
    <div className="rounded border border-zinc-800 bg-black">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) addImageFile(file);
          event.currentTarget.value = "";
        }}
      />

      <div
        data-editor-toolbar
        className="sticky top-16 z-30 rounded-t border-b border-zinc-800 bg-zinc-950 shadow-lg shadow-black/30"
      >
        <div className="flex flex-wrap items-center gap-0.5 p-1.5">
          <ToolbarButton
            title="Undo (Ctrl+Z)"
            disabled={!state.canUndo}
            onClick={() => safeEditor.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Redo (Ctrl+Shift+Z)"
            disabled={!state.canRedo}
            onClick={() => safeEditor.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <Popover
            title="Text style"
            active={state.heading !== "paragraph"}
            triggerClassName="min-w-24 justify-between font-semibold"
            trigger={<span>{activeHeadingLabel}</span>}
          >
            {(close) => (
              <>
                {HEADING_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    active={state.heading === option.value}
                    hint={option.description}
                    onClick={() => {
                      setHeadingValue(option.value);
                      close();
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </>
            )}
          </Popover>

          <ToolbarDivider />

          <ToolbarButton
            title="Bold (Ctrl+B)"
            active={state.bold}
            onClick={() => safeEditor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Italic (Ctrl+I)"
            active={state.italic}
            onClick={() => safeEditor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Underline (Ctrl+U)"
            active={state.underline}
            onClick={() => safeEditor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Strikethrough"
            active={state.strike}
            onClick={() => safeEditor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Subscript"
            active={state.subscript}
            onClick={() => safeEditor.chain().focus().toggleSubscript().run()}
          >
            <SubscriptIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Superscript"
            active={state.superscript}
            onClick={() => safeEditor.chain().focus().toggleSuperscript().run()}
          >
            <SuperscriptIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Clear formatting"
            onClick={() => safeEditor.chain().focus().unsetAllMarks().run()}
          >
            <RemoveFormatting className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <Popover
            title="Text color"
            active={Boolean(state.textColor)}
            trigger={
              <span className="relative inline-flex">
                <Type className="h-4 w-4" />
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-1 w-4 rounded-full"
                  style={{ backgroundColor: state.textColor || "#a1a1aa" }}
                />
              </span>
            }
            panelClassName="w-52"
          >
            {(close) => (
              <ColorPanel
                colors={TEXT_COLORS}
                label="Text color"
                allowCustom
                swatchShape="rounded-full"
                close={close}
                onClear={() => safeEditor.chain().focus().unsetColor().run()}
                onSelect={(color) => safeEditor.chain().focus().setColor(color).run()}
              />
            )}
          </Popover>

          <Popover
            title="Highlight"
            active={state.highlight}
            trigger={<Highlighter className="h-4 w-4" />}
            panelClassName="w-52"
          >
            {(close) => (
              <ColorPanel
                colors={HIGHLIGHT_COLORS}
                label="Highlight"
                swatchShape="rounded"
                close={close}
                onClear={() => safeEditor.chain().focus().unsetHighlight().run()}
                onSelect={(color) => safeEditor.chain().focus().setHighlight({ color }).run()}
              />
            )}
          </Popover>

          <ToolbarDivider />

          <ToolbarButton
            title="Bullet list"
            active={state.bulletList}
            onClick={() => safeEditor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>

          <Popover title="Bullet style" active={state.bulletList} trigger={null} panelClassName="w-44">
            {(close) => (
              <>
                {BULLET_LIST_STYLES.map((style) => (
                  <MenuItem
                    key={style.value}
                    active={state.bulletList && state.bulletStyle === style.value}
                    onClick={() => {
                      setListStyle("bulletList", style.value);
                      close();
                    }}
                  >
                    {style.label}
                  </MenuItem>
                ))}
              </>
            )}
          </Popover>

          <ToolbarButton
            title="Numbered list"
            active={state.orderedList}
            onClick={() => safeEditor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <Popover
            title="Numbering style"
            active={state.orderedList}
            trigger={null}
            panelClassName="w-44"
          >
            {(close) => (
              <>
                {ORDERED_LIST_STYLES.map((style) => (
                  <MenuItem
                    key={style.value}
                    active={state.orderedList && state.orderedStyle === style.value}
                    onClick={() => {
                      setListStyle("orderedList", style.value);
                      close();
                    }}
                  >
                    {style.label}
                  </MenuItem>
                ))}
              </>
            )}
          </Popover>

          <ToolbarButton
            title="Task list"
            active={state.taskList}
            onClick={() => safeEditor.chain().focus().toggleTaskList().run()}
          >
            <ListTodo className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {ALIGN_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <ToolbarButton
                key={option.value}
                title={option.label}
                active={state.align === option.value}
                onClick={() => safeEditor.chain().focus().setTextAlign(option.value).run()}
              >
                <Icon className="h-4 w-4" />
              </ToolbarButton>
            );
          })}

          <ToolbarDivider />

          <Popover
            title="Link"
            active={state.link}
            trigger={<LinkIcon className="h-4 w-4" />}
            panelClassName="w-72"
          >
            {(close) => (
              <LinkPanel
                initialHref={state.linkHref}
                onApply={applyLink}
                onRemove={removeLink}
                close={close}
              />
            )}
          </Popover>

          {articleOptions.length > 0 && (
            <Popover
              title="Link KB article"
              trigger={<BookMarked className="h-4 w-4" />}
              panelClassName="w-72"
            >
              {(close) => (
                <ArticleLinkPanel
                  articles={articleOptions}
                  onSelect={insertArticleLink}
                  close={close}
                />
              )}
            </Popover>
          )}

          <ToolbarButton
            title="Upload image from computer"
            onClick={() => imageInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
          </ToolbarButton>

          <Popover
            title="Image from URL"
            trigger={<ImageIcon className="h-4 w-4" />}
            panelClassName="w-72"
          >
            {(close) => <ImageUrlPanel onInsertUrl={addImageUrl} close={close} />}
          </Popover>

          <ToolbarDivider />

          <ToolbarButton
            title="Insert Table"
            onClick={() =>
              safeEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Add table row"
            disabled={!state.inTable}
            onClick={() => safeEditor.chain().focus().addRowAfter().run()}
          >
            <TableRowsSplit className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Add table column"
            disabled={!state.inTable}
            onClick={() => safeEditor.chain().focus().addColumnAfter().run()}
          >
            <TableColumnsSplit className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Toggle table header row"
            disabled={!state.inTable}
            onClick={() => safeEditor.chain().focus().toggleHeaderRow().run()}
          >
            <PanelTop className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Merge or split table cells"
            disabled={!state.inTable}
            onClick={() => safeEditor.chain().focus().mergeOrSplit().run()}
          >
            <TableCellsMerge className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Delete table row"
            disabled={!state.inTable}
            onClick={() => safeEditor.chain().focus().deleteRow().run()}
          >
            <Rows3 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Delete table column"
            disabled={!state.inTable}
            onClick={() => safeEditor.chain().focus().deleteColumn().run()}
          >
            <Columns3 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Delete table"
            disabled={!state.inTable}
            onClick={() => safeEditor.chain().focus().deleteTable().run()}
          >
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Blockquote"
            active={state.blockquote}
            onClick={() => safeEditor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Inline code"
            active={state.code}
            onClick={() => safeEditor.chain().focus().toggleCode().run()}
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Code block"
            active={state.codeBlock}
            onClick={() => safeEditor.chain().focus().toggleCodeBlock().run()}
          >
            <SquareCode className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Horizontal rule"
            onClick={() => safeEditor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Info callout"
            active={state.calloutType === "info"}
            onClick={() => safeEditor.chain().focus().toggleCallout({ type: "info" }).run()}
          >
            <Info className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Success callout"
            active={state.calloutType === "success"}
            onClick={() => safeEditor.chain().focus().toggleCallout({ type: "success" }).run()}
          >
            <CircleCheck className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Warning callout"
            active={state.calloutType === "warning"}
            onClick={() => safeEditor.chain().focus().toggleCallout({ type: "warning" }).run()}
          >
            <TriangleAlert className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            title="Danger callout"
            active={state.calloutType === "danger"}
            onClick={() => safeEditor.chain().focus().toggleCallout({ type: "danger" }).run()}
          >
            <ShieldAlert className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      <div className="bg-black">
        <EditorContent editor={safeEditor} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-b border-t border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-500">
        <span>
          {state.words} {state.words === 1 ? "word" : "words"} · {state.characters}{" "}
          {state.characters === 1 ? "character" : "characters"}
        </span>
        <span className="hidden sm:inline">
          Paste or drop images directly · Ctrl+Alt+C for a callout
        </span>
      </div>
    </div>
  );
}

/**
 * Shared paste/drop handling: pull image files out of the event and insert them
 * inline as data URLs. Returns true when the event was handled.
 */
function insertImageFiles(
  view: EditorView,
  candidates: File[],
  event: Event,
  dropEvent?: DragEvent
): boolean {
  const files = candidates.filter((file) => file.type.startsWith("image/"));
  if (files.length === 0) return false;

  event.preventDefault();

  const dropPos = dropEvent
    ? view.posAtCoords({ left: dropEvent.clientX, top: dropEvent.clientY })?.pos ?? null
    : null;

  for (const file of files) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      const imageNode = view.state.schema.nodes.image.create({
        src: reader.result,
        alt: file.name,
        title: file.name,
        align: "center",
        width: "60%",
      });

      const tr = view.state.tr;

      // Move the selection to the drop point first: replaceSelectionWith knows
      // how to fit a block node into whatever is there, while a raw insert at
      // an arbitrary coordinate can throw.
      if (dropPos !== null) {
        tr.setSelection(Selection.near(tr.doc.resolve(dropPos)));
      }

      view.dispatch(tr.replaceSelectionWith(imageNode).scrollIntoView());
    };
    reader.readAsDataURL(file);
  }

  return true;
}
