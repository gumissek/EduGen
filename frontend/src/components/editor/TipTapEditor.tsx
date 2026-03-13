"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import DragHandle from "@tiptap/extension-drag-handle-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";

// Icons
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import TableViewIcon from "@mui/icons-material/TableView";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// Matches "1." / "2." etc. at the very start of a block's text content,
// optionally preceded by bold/strong tags or whitespace.
const QUESTION_NUMBER_REGEX = /^(\s*(?:<[^>]+>)?\s*)\d+\.\s/;

/**
 * After a drag-and-drop reorder, walks through every top-level paragraph/heading
 * that starts with a question number pattern and re-numbers them sequentially.
 * Returns the updated HTML string, or the original if nothing changed.
 */
function renumberQuestions(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks = doc.body.children;
  let counter = 1;
  let changed = false;

  for (const block of Array.from(blocks)) {
    const text = block.textContent ?? "";
    if (QUESTION_NUMBER_REGEX.test(text)) {
      // Replace only the leading number in the text node tree
      replaceLeadingNumber(block, counter);
      counter++;
      changed = true;
    }
  }

  return changed ? doc.body.innerHTML : html;
}

/** Recursively finds the first text node that contains a leading "N. " pattern and replaces the number. */
function replaceLeadingNumber(node: Node, newNumber: number): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    const match = text.match(/^(\s*)\d+\.\s/);
    if (match) {
      node.textContent = text.replace(/^(\s*)\d+\.\s/, `$1${newNumber}. `);
      return true;
    }
    return false;
  }
  for (const child of Array.from(node.childNodes)) {
    if (replaceLeadingNumber(child, newNumber)) return true;
  }
  return false;
}

interface TipTapEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export default function TipTapEditor({
  initialContent,
  onChange,
  readOnly = false,
}: TipTapEditorProps) {
  // Track whether the last update was triggered by a drag-and-drop
  const isDraggingRef = React.useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Utworzony materiał pojawi się tutaj...",
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      let html = editor.getHTML();
      if (isDraggingRef.current) {
        html = renumberQuestions(html);
        if (html !== editor.getHTML()) {
          // Update content silently so undo history stays clean
          editor.commands.setContent(html, { emitUpdate: false });
        }
        isDraggingRef.current = false;
      }
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  // Update editor content when initialContent changes (e.g. reprompt response)
  React.useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () =>
    editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () =>
    editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () =>
    editor.chain().focus().toggleBlockquote().run();
  const setAlignLeft = () => editor.chain().focus().setTextAlign("left").run();
  const setAlignCenter = () =>
    editor.chain().focus().setTextAlign("center").run();
  const setAlignRight = () =>
    editor.chain().focus().setTextAlign("right").run();
  const insertTable = () =>
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();

  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: "24px",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
      }}
    >
      {!readOnly && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            p: 1,
            borderBottom: 1,
            borderColor: "divider",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <Tooltip title="Pogrubienie">
            <IconButton
              size="small"
              onClick={toggleBold}
              color={editor.isActive("bold") ? "primary" : "default"}
            >
              <FormatBoldIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Kursywa">
            <IconButton
              size="small"
              onClick={toggleItalic}
              color={editor.isActive("italic") ? "primary" : "default"}
            >
              <FormatItalicIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Podkreślenie">
            <IconButton
              size="small"
              onClick={toggleUnderline}
              color={editor.isActive("underline") ? "primary" : "default"}
            >
              <FormatUnderlinedIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />

          <Tooltip title="Wyrównaj do lewej">
            <IconButton
              size="small"
              onClick={setAlignLeft}
              color={
                editor.isActive({ textAlign: "left" }) ? "primary" : "default"
              }
            >
              <FormatAlignLeftIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Wyśrodkuj">
            <IconButton
              size="small"
              onClick={setAlignCenter}
              color={
                editor.isActive({ textAlign: "center" }) ? "primary" : "default"
              }
            >
              <FormatAlignCenterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Wyrównaj do prawej">
            <IconButton
              size="small"
              onClick={setAlignRight}
              color={
                editor.isActive({ textAlign: "right" }) ? "primary" : "default"
              }
            >
              <FormatAlignRightIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />

          <Tooltip title="Lista punktowana">
            <IconButton
              size="small"
              onClick={toggleBulletList}
              color={editor.isActive("bulletList") ? "primary" : "default"}
            >
              <FormatListBulletedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lista numerowana">
            <IconButton
              size="small"
              onClick={toggleOrderedList}
              color={editor.isActive("orderedList") ? "primary" : "default"}
            >
              <FormatListNumberedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cytat">
            <IconButton
              size="small"
              onClick={toggleBlockquote}
              color={editor.isActive("blockquote") ? "primary" : "default"}
            >
              <FormatQuoteIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />

          <Tooltip title="Wstaw tabelę">
            <IconButton size="small" onClick={insertTable}>
              <TableViewIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          bgcolor: "background.paper",
          position: "relative",
          px: 0.4,
        }}
      >
        {!readOnly && (
          <DragHandle
            editor={editor}
            onElementDragStart={() => {
              isDraggingRef.current = true;
            }}
          >
            <Tooltip title="Przeciągnij, aby zmienić kolejność">
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "grab",
                  color: "text.disabled",
                  opacity: 0.6,
                  "&:hover": { opacity: 1, color: "text.secondary" },
                  "&:active": { cursor: "grabbing" },
                }}
              >
                <DragIndicatorIcon fontSize="small" />
              </Box>
            </Tooltip>
          </DragHandle>
        )}
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}
