"use client";

import { useEffect, useRef, useState } from "react";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
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
import {
  AlertTriangle,
  Bold,
  CircleSlash,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Captions,
  Maximize2,
  RotateCcw,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Minus,
  Highlighter,
  Info,
  Table as TableIcon,
  Rows3,
  Columns3,
  Trash2,
  ChevronDown,
  Type,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
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

type HeadingValue = (typeof HEADING_OPTIONS)[number]["value"];

type ColorOption = {
  label: string;
  value: string;
};

type ImageAlign = "left" | "center" | "right";

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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
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
      const nextWidth = Math.max(160, Math.min(editorWidth, startWidth + delta));
      updateAttributes({ width: `${Math.round(nextWidth)}px` });
    };

    const handlePointerUp = () => {
      setResizing(false);
      document.body.classList.remove("kb-image-resizing");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    document.body.classList.add("kb-image-resizing");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <NodeViewWrapper
      as="figure"
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
        parseHTML: (element) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width};`,
          };
        },
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
    const align = normalizeImageAlign(HTMLAttributes["data-align"] || HTMLAttributes.align);
    const width = HTMLAttributes.width || HTMLAttributes.style?.match(/width:\s*([^;]+)/)?.[1] || null;
    const sizeAttributes = width
      ? {
          width,
          style: `width: ${width}; max-width: 100%; height: auto;`,
        }
      : {
          style: "max-width: 100%; height: auto;",
        };

    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-align": align,
        ...sizeAttributes,
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
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes["data-callout-type"] || HTMLAttributes.type || "info";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: `kb-callout kb-callout-${type}`,
      }),
      0,
    ];
  },
});

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-10 min-w-10 items-center justify-center border-r border-zinc-700 px-3 text-sm transition ${
        active
          ? "bg-zinc-700 text-white"
          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange }: Props) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [toolbarVersion, setToolbarVersion] = useState(0);
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
        const files = Array.from(event.clipboardData?.files || []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (files.length === 0) return false;

        event.preventDefault();

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

            view.dispatch(
              view.state.tr.replaceSelectionWith(imageNode).scrollIntoView()
            );
          };
          reader.readAsDataURL(file);
        }

        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setToolbarVersion((version) => version + 1);
    },
    onSelectionUpdate: () => {
      setToolbarVersion((version) => version + 1);
    },
    onTransaction: () => {
      setToolbarVersion((version) => version + 1);
    },
    onFocus: () => {
      setToolbarVersion((version) => version + 1);
    },
    onBlur: () => {
      setToolbarVersion((version) => version + 1);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  const headingValue: HeadingValue = (() => {
    void toolbarVersion;
    if (!editor) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "1";
    if (editor.isActive("heading", { level: 2 })) return "2";
    if (editor.isActive("heading", { level: 3 })) return "3";
    if (editor.isActive("heading", { level: 4 })) return "4";
    if (editor.isActive("heading", { level: 5 })) return "5";
    return "paragraph";
  })();

  if (!editor) {
    return (
      <div className="rounded border border-zinc-800 bg-black p-4 text-zinc-400">
        Loading editor...
      </div>
    );
  }

  const safeEditor = editor;

  function setLink() {
    const previousUrl = safeEditor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL", previousUrl);

    if (url === null) return;
    if (url === "") {
      safeEditor.chain().focus().unsetLink().run();
      return;
    }

    safeEditor.chain().focus().setLink({ href: url }).run();
  }

  function addImage() {
    const url = window.prompt("Enter image URL");
    if (!url) return;
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

  function setOrderedListStyle(style: string) {
    if (!safeEditor.isActive("orderedList")) {
      safeEditor.chain().focus().toggleOrderedList().run();
    }
    safeEditor.chain().focus().updateAttributes("orderedList", { listStyle: style }).run();
  }

  function setBulletListStyle(style: string) {
    if (!safeEditor.isActive("bulletList")) {
      safeEditor.chain().focus().toggleBulletList().run();
    }
    safeEditor.chain().focus().updateAttributes("bulletList", { listStyle: style }).run();
  }

  function insertCallout(type: "info" | "warning") {
    const label = type === "warning" ? "Important note" : "Note";
    safeEditor
      .chain()
      .focus()
      .insertContent({
        type: "callout",
        attrs: { type },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: label }],
          },
        ],
      })
      .run();
  }

  function insertTable() {
    safeEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const currentOrderedStyle = safeEditor.getAttributes("orderedList").listStyle || "decimal";
  const currentBulletStyle = safeEditor.getAttributes("bulletList").listStyle || "disc";
  const hasTextColor = Boolean(safeEditor.getAttributes("textStyle").color);

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
      <div className="sticky top-0 z-50 flex flex-wrap items-center rounded-t border-b border-zinc-800 bg-zinc-950 shadow-lg shadow-black/30">
        <ToolbarButton
          title="Undo"
          onClick={() => safeEditor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Redo"
          onClick={() => safeEditor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <HeadingDropdown activeValue={headingValue} onSelect={setHeadingValue} />

        <ToolbarButton
          title="Bold"
          active={safeEditor.isActive("bold")}
          onClick={() => safeEditor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Italic"
          active={safeEditor.isActive("italic")}
          onClick={() => safeEditor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Underline"
          active={safeEditor.isActive("underline")}
          onClick={() => safeEditor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Strike"
          active={safeEditor.isActive("strike")}
          onClick={() => safeEditor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <ColorDropdown
          active={hasTextColor}
          colors={TEXT_COLORS}
          icon={<Type className="h-4 w-4" />}
          label="Text color"
          onClear={() => safeEditor.chain().focus().unsetColor().run()}
          onSelect={(color) => safeEditor.chain().focus().setColor(color).run()}
        />

        <ColorDropdown
          active={safeEditor.isActive("highlight")}
          colors={HIGHLIGHT_COLORS}
          icon={<Highlighter className="h-4 w-4" />}
          label="Highlight"
          onClear={() => safeEditor.chain().focus().unsetHighlight().run()}
          onSelect={(color) => safeEditor.chain().focus().setHighlight({ color }).run()}
          swatchShape="rounded"
        />

        <ToolbarButton
          title="Superscript"
          active={safeEditor.isActive("superscript")}
          onClick={() => safeEditor.chain().focus().toggleSuperscript().run()}
        >
          x2
        </ToolbarButton>

        <ToolbarButton
          title="Subscript"
          active={safeEditor.isActive("subscript")}
          onClick={() => safeEditor.chain().focus().toggleSubscript().run()}
        >
          x_
        </ToolbarButton>

        <ToolbarButton
          title="Inline Code"
          active={safeEditor.isActive("code")}
          onClick={() => safeEditor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Code Block"
          active={safeEditor.isActive("codeBlock")}
          onClick={() => safeEditor.chain().focus().toggleCodeBlock().run()}
        >
          {"{}"}
        </ToolbarButton>

        <ToolbarButton
          title="Bullet List"
          active={safeEditor.isActive("bulletList")}
          onClick={() => safeEditor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <div className="border-r border-zinc-700 bg-zinc-900 px-2 py-2">
          <select
            value={currentBulletStyle}
            onChange={(event) => setBulletListStyle(event.target.value)}
            className="max-w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white outline-none"
            title="Bullet style"
          >
            {BULLET_LIST_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        <ToolbarButton
          title="Ordered List"
          active={safeEditor.isActive("orderedList")}
          onClick={() => safeEditor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="border-r border-zinc-700 bg-zinc-900 px-2 py-2">
          <select
            value={currentOrderedStyle}
            onChange={(event) => setOrderedListStyle(event.target.value)}
            className="max-w-28 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white outline-none"
            title="Numbered list style"
          >
            {ORDERED_LIST_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        <ToolbarButton
          title="Task List"
          active={safeEditor.isActive("taskList")}
          onClick={() => safeEditor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Blockquote"
          active={safeEditor.isActive("blockquote")}
          onClick={() => safeEditor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Info Callout"
          active={safeEditor.isActive("callout", { type: "info" })}
          onClick={() => insertCallout("info")}
        >
          <Info className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Warning Callout"
          active={safeEditor.isActive("callout", { type: "warning" })}
          onClick={() => insertCallout("warning")}
        >
          <AlertTriangle className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Horizontal Rule"
          onClick={() => safeEditor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Align Left"
          active={safeEditor.isActive({ textAlign: "left" })}
          onClick={() => safeEditor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Align Center"
          active={safeEditor.isActive({ textAlign: "center" })}
          onClick={() => safeEditor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Align Right"
          active={safeEditor.isActive({ textAlign: "right" })}
          onClick={() => safeEditor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Link"
          active={safeEditor.isActive("link")}
          onClick={setLink}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Upload image from computer"
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Insert image from URL"
          onClick={addImage}
        >
          URL
        </ToolbarButton>

        <ToolbarButton
          title="Insert Table"
          onClick={insertTable}
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Add Row"
          onClick={() => safeEditor.chain().focus().addRowAfter().run()}
        >
          <Rows3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Add Column"
          onClick={() => safeEditor.chain().focus().addColumnAfter().run()}
        >
          <Columns3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Delete Table"
          onClick={() => safeEditor.chain().focus().deleteTable().run()}
        >
          <Trash2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="bg-black">
        <EditorContent editor={safeEditor} />
      </div>
    </div>
  );
}

function HeadingDropdown({
  activeValue,
  onSelect,
}: {
  activeValue: HeadingValue;
  onSelect: (value: HeadingValue) => void;
}) {
  const activeLabel =
    HEADING_OPTIONS.find((option) => option.value === activeValue)?.label || "Paragraph";

  return (
    <details className="group relative border-r border-zinc-700">
      <summary
        title="Text style"
        className={`flex h-10 min-w-24 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold transition marker:hidden [&::-webkit-details-marker]:hidden ${
          activeValue !== "paragraph"
            ? "bg-zinc-700 text-white"
            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        }`}
      >
        <span>{activeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-11 z-30 w-52 rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
        {HEADING_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
              activeValue === option.value
                ? "bg-orange-500/15 text-orange-100"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs text-zinc-500">{option.description}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

function ColorDropdown({
  active,
  colors,
  icon,
  label,
  onClear,
  onSelect,
  swatchShape = "rounded-full",
}: {
  active?: boolean;
  colors: ColorOption[];
  icon: React.ReactNode;
  label: string;
  onClear: () => void;
  onSelect: (value: string) => void;
  swatchShape?: string;
}) {
  return (
    <details className="group relative border-r border-zinc-700">
      <summary
        title={label}
        className={`flex h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm transition marker:hidden [&::-webkit-details-marker]:hidden ${
          active
            ? "bg-zinc-700 text-white"
            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        }`}
      >
        {icon}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-11 z-30 min-w-48 rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
        <button
          type="button"
          onClick={onClear}
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
              onClick={() => onSelect(color.value)}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 p-2 text-xs text-zinc-300 transition hover:border-orange-300/60 hover:bg-zinc-900"
            >
              <span
                className={`h-5 w-5 border border-zinc-600 ${swatchShape}`}
                style={{ backgroundColor: color.value }}
              />
              <span className="sr-only">{color.label}</span>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
