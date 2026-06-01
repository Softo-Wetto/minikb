"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
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
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
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
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

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
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        link: false,
        underline: false,
      }),
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
      Highlight,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image.configure({
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
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  const headingLabel = useMemo(() => {
    if (!editor) return "Paragraph";
    if (editor.isActive("heading", { level: 1 })) return "Header Large";
    if (editor.isActive("heading", { level: 2 })) return "Header Medium";
    if (editor.isActive("heading", { level: 3 })) return "Header Small";
    if (editor.isActive("heading", { level: 4 })) return "Header Tiny";
    return "Paragraph";
  }, [editor]);

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
    safeEditor.chain().focus().setImage({ src: url }).run();
  }

  function setTextColor() {
    const color = window.prompt("Enter text color (example: #ff6600 or red)", "#ffffff");
    if (!color) return;
    safeEditor.chain().focus().setColor(color).run();
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

  return (
    <div className="overflow-hidden rounded border border-zinc-800 bg-black">
      <div className="flex flex-wrap items-center border-b border-zinc-800 bg-zinc-950">
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

        <div className="border-r border-zinc-700 px-2 py-2">
          <select
            value={headingLabel}
            onChange={(e) => {
              const selected = e.target.value;

              if (selected === "Paragraph") {
                safeEditor.chain().focus().setParagraph().run();
              } else if (selected === "Header Large") {
                safeEditor.chain().focus().setHeading({ level: 1 }).run();
              } else if (selected === "Header Medium") {
                safeEditor.chain().focus().setHeading({ level: 2 }).run();
              } else if (selected === "Header Small") {
                safeEditor.chain().focus().setHeading({ level: 3 }).run();
              } else if (selected === "Header Tiny") {
                safeEditor.chain().focus().setHeading({ level: 4 }).run();
              }
            }}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white outline-none"
          >
            <option>Header Large</option>
            <option>Header Medium</option>
            <option>Header Small</option>
            <option>Header Tiny</option>
            <option>Paragraph</option>
          </select>
        </div>

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

        <ToolbarButton
          title="Highlight"
          active={safeEditor.isActive("highlight")}
          onClick={() => safeEditor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>

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
          title="Text Color"
          onClick={setTextColor}
        >
          A
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
          title="Heading 1"
          active={safeEditor.isActive("heading", { level: 1 })}
          onClick={() => safeEditor.chain().focus().setHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Heading 2"
          active={safeEditor.isActive("heading", { level: 2 })}
          onClick={() => safeEditor.chain().focus().setHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Heading 3"
          active={safeEditor.isActive("heading", { level: 3 })}
          onClick={() => safeEditor.chain().focus().setHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Bullet List"
          active={safeEditor.isActive("bulletList")}
          onClick={() => safeEditor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Ordered List"
          active={safeEditor.isActive("orderedList")}
          onClick={() => safeEditor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

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
          title="Image"
          onClick={addImage}
        >
          <ImageIcon className="h-4 w-4" />
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
