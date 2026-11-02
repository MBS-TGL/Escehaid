"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Youtube from "@tiptap/extension-youtube";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  ListChecks,
  Quotes,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  Link as LinkIcon,
  TextHTwo,
  ArrowUUpLeft,
  ArrowUUpRight,
  Minus,
  Code,
  CodeBlock,
  Image as ImageIcon,
  SquaresFour,
  Palette,
  VideoCamera,
  Trash,
} from "@/components/Icons";

/** Palet warna teks: brand situs + warna dasar tulis. */
const TEXT_COLORS = [
  "#0f172a", // slate-900 (default)
  "#475569", // slate-600
  "#94a3b8", // slate-400
  "#b91c1c", // red-700
  "#c2410c", // orange-700
  "#a16207", // yellow-700
  "#15803d", // green-700
  "#0e7490", // cyan-700
  "#1d4ed8", // blue-700
  "#7c3aed", // violet-700
];

/** Ekstrak ID video YouTube dari URL tonton/bagi/embed. */
function parseYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
};

function ToolbarBtn({
  onClick,
  active = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    // Tooltip di wrapper: tombol disabled tidak menerima pointer.
    <span className="inline-flex" title={title}>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors
        ${active ? "bg-[var(--brand-primary)] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}
        ${disabled ? "opacity-30" : ""}`}
    >
      {children}
    </button>
    </span>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-slate-200" />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis konten di sini...",
  maxLength,
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[var(--brand-accent)] underline hover:text-[var(--brand-primary)]" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Subscript,
      Superscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        controls: false,
        nocookie: true,
        modestBranding: true,
        HTMLAttributes: { class: "tiptap-youtube" },
      }),
      ...(maxLength ? [CharacterCount.configure({ limit: maxLength })] : []),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor min-h-[200px] px-4 py-3 focus:outline-none text-slate-700 leading-relaxed",
      },
    },
  });

  // Sinkronkan nilai eksternal (mis. isi-otomatis AI, reset form) ke editor.
  // Perubahan dari editor sendiri tidak ikut diproses (value === getHTML) dan
  // tanpa emitUpdate agar tidak memicu onChange balik ke form.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const charCount = editor.storage.characterCount?.characters?.() ?? null;
  const wordCount = editor.storage.characterCount?.words?.() ?? null;
  const activeColor = editor.getAttributes("textStyle").color as string | undefined;
  const inTable = editor.isActive("table");

  const setVideo = () => {
    const url = window.prompt("URL YouTube (tonton/bagi/embed)");
    if (!url) return;
    const id = parseYoutubeId(url.trim());
    if (!id) {
      window.alert("URL YouTube tidak dikenali.");
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${id}` }).run();
  };

  const setCaption = () => {
    const cap = window.prompt("Caption gambar (kosongkan untuk menghapus)");
    if (cap === null) return;
    editor.chain().focus().updateAttributes("image", { title: cap }).run();
  };

  return (
    <div className={`overflow-hidden rounded-b-xl border border-slate-200 bg-white transition-colors focus-within:border-[var(--brand-accent)] focus-within:ring-2 focus-within:ring-[var(--brand-accent)]/20 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-3 py-2">
        {/* History */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <ArrowUUpLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <ArrowUUpRight className="h-4 w-4" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Heading */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <TextHTwo className="h-4 w-4" />
        </ToolbarBtn>

        {/* Text formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <TextB className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <TextItalic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <TextUnderline className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <TextStrikethrough className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive("subscript")}
          title="Subscript (X₂)"
        >
          <span className="text-[13px] font-bold leading-none">X<sub>2</sub></span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive("superscript")}
          title="Superscript (X²)"
        >
          <span className="text-[13px] font-bold leading-none">X<sup>2</sup></span>
        </ToolbarBtn>
        {/* Warna teks */}
        <span className="relative inline-flex items-center" title="Warna teks">
          <label
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors ${
              activeColor ? "bg-[var(--brand-primary)] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
            aria-label="Warna teks"
          >
            <Palette className="h-4 w-4" />
            <input
              type="color"
              className="sr-only"
              value={activeColor || "#0f172a"}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
          </label>
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Warna ${c}`}
              title={c}
              onClick={() => editor.chain().focus().setColor(c).run()}
              className={`ml-0.5 hidden h-4 w-4 rounded-full border border-slate-300 md:inline-block ${
                activeColor === c ? "ring-2 ring-[var(--brand-accent)] ring-offset-1" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {activeColor && (
            <button
              type="button"
              aria-label="Hapus warna teks"
              title="Hapus warna"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="ml-1 hidden text-[11px] font-semibold text-slate-400 hover:text-red-500 md:inline-block"
            >
              ✕
            </button>
          )}
        </span>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <ListBullets className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListNumbers className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive("taskList")}
          title="Task List"
        >
          <ListChecks className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quotes className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <CodeBlock className="h-4 w-4" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <TextAlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <TextAlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <TextAlignRight className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <TextAlignJustify className="h-4 w-4" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Insert */}
        <ToolbarBtn
          onClick={() => {
            const url = window.prompt("Image URL");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          title="Insert Image"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>
        {editor.isActive("image") && (
          <ToolbarBtn onClick={setCaption} title="Caption gambar (tersimpan di title)">
            <span className="text-[11px] font-bold leading-none">CC</span>
          </ToolbarBtn>
        )}
        <ToolbarBtn onClick={setVideo} title="Sisip video YouTube">
          <VideoCamera className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={setLink}
          active={editor.isActive("link")}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Tabel */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Sisip tabel 3×3"
        >
          <SquaresFour className="h-4 w-4" />
        </ToolbarBtn>
        {inTable && (
          <>
            <ToolbarBtn
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              title="Tambah kolom kiri"
            >
              <span className="text-[11px] font-bold leading-none">+C</span>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().addRowBefore().run()}
              title="Tambah baris atas"
            >
              <span className="text-[11px] font-bold leading-none">+R</span>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().mergeCells().run()}
              title="Gabung sel terpilih"
            >
              <span className="text-[11px] font-bold leading-none">⿻</span>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().splitCell().run()}
              title="Pisah sel"
            >
              <span className="text-[11px] font-bold leading-none">◫</span>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              active={editor.isActive("tableHeader")}
              title="Baris header"
            >
              <span className="text-[11px] font-bold leading-none">H</span>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Hapus kolom"
            >
              <span className="text-[11px] font-bold leading-none">−C</span>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Hapus baris"
            >
              <span className="text-[11px] font-bold leading-none">−R</span>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Hapus tabel"
            >
              <Trash className="h-4 w-4" />
            </ToolbarBtn>
          </>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Footer */}
      {(maxLength || wordCount !== null) && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2">
          {wordCount !== null && (
            <span className="text-[11px] text-slate-400">{wordCount} kata</span>
          )}
          {maxLength && charCount !== null && (
            <span className={`text-[11px] ${charCount > maxLength * 0.9 ? "text-red-500" : "text-slate-400"}`}>
              {charCount.toLocaleString()} / {maxLength.toLocaleString()} karakter
            </span>
          )}
        </div>
      )}
    </div>
  );
}
