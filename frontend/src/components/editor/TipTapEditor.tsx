'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';

// Icons
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import TableViewIcon from '@mui/icons-material/TableView';

interface TipTapEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export default function TipTapEditor({ initialContent, onChange, readOnly = false }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Utworzony materiał pojawi się tutaj...' }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4',
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
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const setAlignLeft = () => editor.chain().focus().setTextAlign('left').run();
  const setAlignCenter = () => editor.chain().focus().setTextAlign('center').run();
  const setAlignRight = () => editor.chain().focus().setTextAlign('right').run();
  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  return (
    <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {!readOnly && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', p: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
          <Tooltip title="Pogrubienie">
            <IconButton size="small" onClick={toggleBold} color={editor.isActive('bold') ? 'primary' : 'default'}><FormatBoldIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Kursywa">
            <IconButton size="small" onClick={toggleItalic} color={editor.isActive('italic') ? 'primary' : 'default'}><FormatItalicIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Podkreślenie">
            <IconButton size="small" onClick={toggleUnderline} color={editor.isActive('underline') ? 'primary' : 'default'}><FormatUnderlinedIcon /></IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />
          
          <Tooltip title="Wyrównaj do lewej">
            <IconButton size="small" onClick={setAlignLeft} color={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'default'}><FormatAlignLeftIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Wyśrodkuj">
            <IconButton size="small" onClick={setAlignCenter} color={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'default'}><FormatAlignCenterIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Wyrównaj do prawej">
            <IconButton size="small" onClick={setAlignRight} color={editor.isActive({ textAlign: 'right' }) ? 'primary' : 'default'}><FormatAlignRightIcon /></IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />

          <Tooltip title="Lista punktowana">
            <IconButton size="small" onClick={toggleBulletList} color={editor.isActive('bulletList') ? 'primary' : 'default'}><FormatListBulletedIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Lista numerowana">
            <IconButton size="small" onClick={toggleOrderedList} color={editor.isActive('orderedList') ? 'primary' : 'default'}><FormatListNumberedIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Cytat">
            <IconButton size="small" onClick={toggleBlockquote} color={editor.isActive('blockquote') ? 'primary' : 'default'}><FormatQuoteIcon /></IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />

          <Tooltip title="Wstaw tabelę">
            <IconButton size="small" onClick={insertTable}><TableViewIcon /></IconButton>
          </Tooltip>
        </Box>
      )}
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'background.paper' }}>
        <style jsx global>{`
          .ProseMirror {
            min-height: 400px;
          }
          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 0;
            overflow: hidden;
          }
          .ProseMirror table td,
          .ProseMirror table th {
            min-width: 1em;
            border: 1px solid #ddd;
            padding: 3px 5px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }
          .ProseMirror table th {
            font-weight: bold;
            text-align: left;
            background-color: #f1f3f5;
          }
        `}</style>
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}
