"use client";

import * as React from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CellSelection } from "@tiptap/pm/tables";
import { Mark, mergeAttributes } from "@tiptap/core";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import DragHandle from "@tiptap/extension-drag-handle-react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useTheme } from "@mui/material/styles";
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
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CallMergeIcon from "@mui/icons-material/CallMerge";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import CheckIcon from "@mui/icons-material/Check";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

// ─── Comment Mark Extension ─────────────────────────────────────────────────

const CommentMark = Mark.create({
  name: "comment",
  addAttributes() {
    return {
      comment: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "mark.tiptap-comment" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes, {
        class: "tiptap-comment",
        "data-comment": HTMLAttributes.comment,
      }),
      0,
    ];
  },
});

// ─── Table Bubble Menu ────────────────────────────────────────────────────────

function TableBubbleMenu({ editor }: { editor: Editor }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { canMerge, canSplit } = useEditorState({
    editor,
    selector: (ctx) => {
      const sel = ctx.editor.state.selection;
      const isCellSel = sel instanceof CellSelection;
      let isMergedCell = false;
      try {
        const cell = sel.$from.node(-1);
        isMergedCell =
          cell != null && (cell.attrs.colspan > 1 || cell.attrs.rowspan > 1);
      } catch {}
      return { canMerge: isCellSel, canSplit: !isCellSel && isMergedCell };
    },
  });

  const dividerSx = {
    mx: 0.75,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };

  const btnSx = {
    borderRadius: 1.5,
    width: 30,
    height: 30,
    color: isDark ? "grey.200" : "grey.700",
    "&:hover": {
      bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
    },
    "&.Mui-disabled": { opacity: 0.3 },
  };

  const dangerSx = {
    ...btnSx,
    color: "error.main",
    "&:hover": {
      bgcolor: isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.08)",
    },
  };

  const labelSx = {
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "text.disabled",
    px: 0.5,
    userSelect: "none",
  };

  return (
    <BubbleMenu
      pluginKey="tableBubbleMenu"
      editor={editor}
      shouldShow={({ state }) => {
        if (state.selection instanceof CellSelection) return true;
        // Check both ends of selection for table context
        for (const pos of [state.selection.$from, state.selection.$to]) {
          for (let d = pos.depth; d > 0; d--) {
            const name = pos.node(d).type.name;
            if (name === "tableCell" || name === "tableHeader") return true;
          }
        }
        return false;
      }}
      options={{ placement: "top", offset: 10, flip: true, shift: true }}
      appendTo={() => document.body}
    >
      <Paper
        elevation={6}
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: 0.25,
          px: 1,
          py: 0.5,
          borderRadius: "12px",
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          bgcolor: isDark ? "rgba(15,15,15,0.97)" : "rgba(255,255,255,0.97)",
          backdropFilter: "blur(16px)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.6)"
            : "0 8px 32px rgba(0,0,0,0.14)",
          whiteSpace: "nowrap",
        }}
      >
        <Typography sx={labelSx}>Kol.</Typography>
        <Tooltip title="Dodaj kolumnę przed" placement="top">
          <IconButton
            size="small"
            sx={btnSx}
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          >
            <KeyboardArrowLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Dodaj kolumnę po" placement="top">
          <IconButton
            size="small"
            sx={btnSx}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <KeyboardArrowRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Usuń kolumnę" placement="top">
          <IconButton
            size="small"
            sx={dangerSx}
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={dividerSx} />

        <Typography sx={labelSx}>Wier.</Typography>
        <Tooltip title="Dodaj wiersz przed" placement="top">
          <IconButton
            size="small"
            sx={btnSx}
            onClick={() => editor.chain().focus().addRowBefore().run()}
          >
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Dodaj wiersz po" placement="top">
          <IconButton
            size="small"
            sx={btnSx}
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Usuń wiersz" placement="top">
          <IconButton
            size="small"
            sx={dangerSx}
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={dividerSx} />

        <Tooltip
          placement="top"
          title={
            canMerge
              ? "Scal zaznaczone komórki"
              : "Zaznacz kilka komórek: kliknij i przeciągnij lub Shift+klik"
          }
        >
          <span>
            <IconButton
              size="small"
              sx={{
                ...btnSx,
                ...(canMerge && {
                  color: "primary.main",
                  bgcolor: isDark ? "rgba(99,102,241,0.2)" : "primary.50",
                }),
              }}
              onClick={() => editor.chain().focus().mergeCells().run()}
              disabled={!canMerge}
            >
              <CallMergeIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip
          placement="top"
          title={
            canSplit
              ? "Rozdziel scaloną komórkę"
              : "Kursor musi być w scalonej komórce"
          }
        >
          <span>
            <IconButton
              size="small"
              sx={{
                ...btnSx,
                ...(canSplit && {
                  color: "primary.main",
                  bgcolor: isDark ? "rgba(99,102,241,0.2)" : "primary.50",
                }),
              }}
              onClick={() => editor.chain().focus().splitCell().run()}
              disabled={!canSplit}
            >
              <CallSplitIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip
          placement="top"
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: isDark ? "grey.800" : "grey.900",
                color: "#fff",
                boxShadow: 3,
                p: 1.5,
                borderRadius: 2,
                maxWidth: 240,
              },
            },
          }}
          title={
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  display: "block",
                  mb: 0.75,
                  fontSize: "0.75rem",
                }}
              >
                📌 Jak zaznaczać komórki?
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                • <strong>Klik + przeciągnij</strong> myszą po komórkach
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                • <strong>Shift + klik</strong> na drugiej komórce
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.75,
                  opacity: 0.75,
                  fontStyle: "italic",
                }}
              >
                Zaznaczone komórki podświetlają się na niebiesko
              </Typography>
            </Box>
          }
        >
          <IconButton
            size="small"
            sx={{
              ...btnSx,
              color: isDark ? "grey.500" : "grey.400",
              width: 22,
              height: 22,
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={dividerSx} />

        <Tooltip title="Usuń całą tabelę" placement="top">
          <IconButton
            size="small"
            sx={dangerSx}
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>
    </BubbleMenu>
  );
}

// ─── Comment Bubble Menu ────────────────────────────────────────────────────

function CommentBubbleMenu({ editor }: { editor: Editor }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [inputValue, setInputValue] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { isInComment, selectionEmpty, activeComment } = useEditorState({
    editor,
    selector: (ctx) => {
      const { selection } = ctx.editor.state;
      const inComment = ctx.editor.isActive("comment");
      return {
        isInComment: inComment,
        selectionEmpty: selection.empty,
        activeComment: inComment
          ? ((ctx.editor.getAttributes("comment").comment as string) ?? "")
          : "",
      };
    },
  });

  const showAddMode = !selectionEmpty && !isInComment;

  const prevShowAddModeRef = React.useRef(false);
  React.useEffect(() => {
    if (showAddMode && !prevShowAddModeRef.current) {
      setInputValue("");
      setIsEditing(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
    prevShowAddModeRef.current = showAddMode;
  }, [showAddMode]);

  React.useEffect(() => {
    if (!isInComment) setIsEditing(false);
  }, [isInComment]);

  const handleConfirm = () => {
    const text = inputValue.trim();
    if (!text) return;
    editor.chain().focus().setMark("comment", { comment: text }).run();
    setInputValue("");
  };

  const handleEditConfirm = () => {
    const text = inputValue.trim();
    if (!text) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("comment")
      .setMark("comment", { comment: text })
      .run();
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setInputValue(activeComment);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isEditing) { handleEditConfirm(); } else { handleConfirm(); }
    }
    if (e.key === "Escape") {
      if (isEditing) {
        setIsEditing(false);
      } else {
        editor.commands.blur();
      }
    }
  };

  const bubbleSx = {
    display: "flex",
    alignItems: "center",
    gap: 0.75,
    px: 1.25,
    py: 0.75,
    borderRadius: "12px",
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    bgcolor: isDark ? "rgba(15,15,15,0.97)" : "rgba(255,255,255,0.97)",
    backdropFilter: "blur(16px)",
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.6)"
      : "0 8px 32px rgba(0,0,0,0.14)",
  };

  return (
    <BubbleMenu
      pluginKey="commentBubbleMenu"
      editor={editor}
      shouldShow={({ state }) => {
        // Never show comment menu inside a table
        if (state.selection instanceof CellSelection) return false;
        for (const pos of [state.selection.$from, state.selection.$to]) {
          for (let d = pos.depth; d > 0; d--) {
            const name = pos.node(d).type.name;
            if (name === "tableCell" || name === "tableHeader") return false;
          }
        }
        // Show when cursor is inside a comment (viewing/deleting)
        if (state.selection.empty) {
          const marks = state.selection.$from.marks();
          if (marks.some((m) => m.type.name === "comment")) return true;
          return false;
        }
        // Show when there is a text selection (adding a new comment)
        return true;
      }}
      options={{ placement: "top", offset: 10, flip: true, shift: true }}
      appendTo={() => document.body}
    >
      <Paper elevation={6} sx={bubbleSx}>
        {showAddMode ? (
          <>
            <ChatBubbleOutlineIcon
              sx={{ fontSize: 16, color: "warning.main", flexShrink: 0 }}
            />
            <TextField
              inputRef={inputRef}
              size="small"
              placeholder="Dodaj komentarz…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="standard"
              sx={{
                width: 220,
                "& .MuiInput-root": {
                  color: isDark ? "grey.100" : "grey.900",
                },
                "& .MuiInput-underline:before": {
                  borderBottomColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.2)",
                },
              }}
              slotProps={{ input: { style: { fontSize: "0.875rem" } } }}
            />
            <Tooltip title="Zatwierdź (Enter)">
              <span>
                <IconButton
                  size="small"
                  onClick={handleConfirm}
                  disabled={!inputValue.trim()}
                  sx={{
                    color: "success.main",
                    width: 28,
                    height: 28,
                    "&.Mui-disabled": { opacity: 0.3 },
                  }}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </>
        ) : isInComment && isEditing ? (
          <>
            <ChatBubbleOutlineIcon
              sx={{ fontSize: 16, color: "warning.main", flexShrink: 0 }}
            />
            <TextField
              inputRef={inputRef}
              size="small"
              placeholder="Edytuj komentarz…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="standard"
              sx={{
                width: 220,
                "& .MuiInput-root": {
                  color: isDark ? "grey.100" : "grey.900",
                },
                "& .MuiInput-underline:before": {
                  borderBottomColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.2)",
                },
              }}
              slotProps={{ input: { style: { fontSize: "0.875rem" } } }}
            />
            <Tooltip title="Zapisz (Enter)">
              <span>
                <IconButton
                  size="small"
                  onClick={handleEditConfirm}
                  disabled={!inputValue.trim()}
                  sx={{
                    color: "success.main",
                    width: 28,
                    height: 28,
                    "&.Mui-disabled": { opacity: 0.3 },
                  }}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </>
        ) : isInComment ? (
          <>
            <ChatBubbleOutlineIcon
              sx={{ fontSize: 16, color: "warning.main", flexShrink: 0 }}
            />
            <Typography
              sx={{
                fontSize: "0.875rem",
                maxWidth: 220,
                color: isDark ? "grey.100" : "grey.900",
                wordBreak: "break-word",
              }}
            >
              {activeComment}
            </Typography>
            <Tooltip title="Edytuj komentarz">
              <IconButton
                size="small"
                onClick={handleStartEdit}
                sx={{
                  color: isDark ? "grey.300" : "grey.600",
                  width: 28,
                  height: 28,
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.06)",
                  },
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Usuń komentarz">
              <IconButton
                size="small"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("comment")
                    .unsetMark("comment")
                    .run()
                }
                sx={{
                  color: "error.main",
                  width: 28,
                  height: 28,
                  "&:hover": {
                    bgcolor: isDark
                      ? "rgba(239,68,68,0.18)"
                      : "rgba(239,68,68,0.08)",
                  },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
      </Paper>
    </BubbleMenu>
  );
}

// ─── Table Grid Picker ────────────────────────────────────────────────────────

const GRID_MAX = 8;

interface TablePickerProps {
  onSelect: (rows: number, cols: number) => void;
}

function TablePicker({ onSelect }: TablePickerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [hovered, setHovered] = React.useState({ rows: 0, cols: 0 });

  const handleClose = () => {
    setAnchorEl(null);
    setHovered({ rows: 0, cols: 0 });
  };

  return (
    <>
      <Tooltip title="Wstaw tabelę \n ">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            borderRadius: 1.5,
            color: Boolean(anchorEl)
              ? "primary.main"
              : isDark
                ? "grey.300"
                : "grey.700",
            bgcolor: Boolean(anchorEl)
              ? isDark
                ? "rgba(99,102,241,0.2)"
                : "primary.50"
              : "transparent",
            "&:hover": {
              bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
          }}
        >
          <TableViewIcon />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              p: 1.5,
              borderRadius: 2,
              boxShadow: isDark
                ? "0 8px 32px rgba(0,0,0,0.5)"
                : "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            },
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 1,
            textAlign: "center",
            fontWeight: 600,
            color: hovered.rows > 0 ? "primary.main" : "text.secondary",
            minHeight: 18,
          }}
        >
          {hovered.rows > 0
            ? `${hovered.rows} × ${hovered.cols} Tabela`
            : "Wybierz rozmiar"}
        </Typography>

        <Box
          onMouseLeave={() => setHovered({ rows: 0, cols: 0 })}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_MAX}, 22px)`,
            gap: "3px",
          }}
        >
          {Array.from({ length: GRID_MAX * GRID_MAX }).map((_, i) => {
            const row = Math.floor(i / GRID_MAX) + 1;
            const col = (i % GRID_MAX) + 1;
            const isActive = row <= hovered.rows && col <= hovered.cols;
            return (
              <Box
                key={i}
                onMouseEnter={() => setHovered({ rows: row, cols: col })}
                onClick={() => {
                  onSelect(row, col);
                  handleClose();
                }}
                sx={{
                  width: 22,
                  height: 22,
                  border: "1.5px solid",
                  borderRadius: "3px",
                  cursor: "pointer",
                  transition: "all 0.08s ease",
                  borderColor: isActive ? "primary.main" : "divider",
                  bgcolor: isActive
                    ? isDark
                      ? "primary.dark"
                      : "primary.50"
                    : isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.02)",
                  "&:hover": { borderColor: "primary.main" },
                }}
              />
            );
          })}
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 1,
            textAlign: "center",
            color: "text.disabled",
          }}
        >
          maks. {GRID_MAX}×{GRID_MAX}
        </Typography>
      </Popover>
    </>
  );
}

// ─── Editor Global Styles ─────────────────────────────────────────────────────

function EditorGlobalStyles() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const borderColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const headerBg = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)";
  const headerColor = isDark ? "#e2e8f0" : "#1e293b";
  const cellHoverBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)";
  const selectedBg = isDark ? "rgba(99,102,241,0.28)" : "rgba(99,102,241,0.13)";

  return (
    <GlobalStyles
      styles={{
        ".tiptap-editor": {
          outline: "none",
          minHeight: 200,
          fontSize: "0.9375rem",
          lineHeight: 1.65,
          color: theme.palette.text.primary,
        },
        ".tiptap-editor p.is-editor-empty:first-of-type::before": {
          content: "attr(data-placeholder)",
          float: "left",
          color: theme.palette.text.disabled,
          pointerEvents: "none",
          height: 0,
        },

        // ── Fix marginesów tabeli ──────────────────────────────────────────
        // tableWrapper jako pierwszy/ostatni child — zerujemy jego własny margin
        ".tiptap-editor > .tableWrapper:first-of-type": {
          marginTop: "0 !important",
        },
        ".tiptap-editor > .tableWrapper:last-of-type": {
          marginBottom: "0 !important",
        },

        // puste <p> które TipTap wstawia tuż przed tabelą — zero margin i height
        ".tiptap-editor > p:empty": {
          margin: "0 !important",
          height: "0 !important",
          minHeight: "0 !important",
          overflow: "hidden",
        },
        // <p> bezpośrednio przed tableWrapper
        ".tiptap-editor > p + .tableWrapper": { marginTop: "0 !important" },
        // <p> bezpośrednio po tableWrapper
        ".tiptap-editor > .tableWrapper + p:empty": {
          margin: "0 !important",
          height: "0 !important",
        },
        // ─────────────────────────────────────────────────────────────────

        ".tiptap-editor .tableWrapper": {
          overflowX: "auto",
          margin: "16px 0",
          borderRadius: "10px",
          boxShadow: isDark
            ? `0 0 0 1.5px ${borderColor}, 0 4px 16px rgba(0,0,0,0.35)`
            : `0 0 0 1.5px ${borderColor}, 0 4px 16px rgba(0,0,0,0.07)`,
        },
        ".tiptap-editor table": {
          borderCollapse: "collapse",
          width: "100%",
          tableLayout: "fixed",
        },
        ".tiptap-editor td, .tiptap-editor th": {
          border: `1.5px solid ${borderColor} !important`,
          padding: "9px 14px",
          verticalAlign: "top",
          position: "relative",
          minWidth: 80,
          wordBreak: "break-word",
          transition: "background 0.1s",
        },
        ".tiptap-editor th": {
          background: `${headerBg} !important`,
          fontWeight: 700,
          fontSize: "0.82rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: `${headerColor} !important`,
          userSelect: "none",
          borderBottom: `2px solid ${borderColor} !important`,
        },
        ".tiptap-editor tr:not(:first-of-type):hover td": {
          background: cellHoverBg,
        },
        ".tiptap-editor tr:nth-of-type(even) td": {
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.012)",
        },
        ".tiptap-editor .selectedCell::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: selectedBg,
          pointerEvents: "none",
          zIndex: 1,
        },
        ".tiptap-editor .column-resize-handle": {
          position: "absolute",
          right: -2,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: "col-resize",
          background: theme.palette.primary.main,
          opacity: 0,
          transition: "opacity 0.15s",
          zIndex: 20,
          borderRadius: 2,
        },
        ".tiptap-editor .tableWrapper:hover .column-resize-handle": {
          opacity: 0.5,
        },
        ".tiptap-editor .column-resize-handle:hover": {
          opacity: "1 !important",
        },
        ".tiptap-editor.resize-cursor, .tiptap-editor.resize-cursor table": {
          cursor: "col-resize",
        },
        ".tiptap-editor mark.tiptap-comment": {
          background: "#fef08a",
          color: "inherit",
          borderRadius: "3px",
          padding: "0 2px",
          borderBottom: "2px solid #eab308",
          cursor: "pointer",
        },
      }}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUESTION_NUMBER_REGEX = /^(\s*(?:<[^>]+>)?\s*)\d+\.\s/;

/**
 * Extract comment marks from an HTML string as a JSON string.
 * Each entry contains the comment text and the highlighted text.
 */
export function extractCommentsFromHtml(html: string): string | null {
  if (typeof window === "undefined") return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const marks = doc.querySelectorAll("mark.tiptap-comment");
  if (marks.length === 0) return null;
  const comments = Array.from(marks).map((mark) => ({
    comment: mark.getAttribute("data-comment") || "",
    highlighted_text: mark.textContent || "",
  }));
  return JSON.stringify(comments);
}

function renumberQuestions(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks = doc.body.children;
  let counter = 1;
  let changed = false;
  for (const block of Array.from(blocks)) {
    const text = block.textContent ?? "";
    if (QUESTION_NUMBER_REGEX.test(text)) {
      replaceLeadingNumber(block, counter);
      counter++;
      changed = true;
    }
  }
  return changed ? doc.body.innerHTML : html;
}

function replaceLeadingNumber(node: Node, newNumber: number): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (/^(\s*)\d+\.\s/.test(text)) {
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolbarDivider = { divider: true };
type ToolbarButton = {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  active: boolean;
  disabled?: boolean;
};
type ToolbarItem = ToolbarDivider | ToolbarButton;

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isDraggingRef = React.useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CommentMark,
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
          editor.commands.setContent(html, { emitUpdate: false });
        }
        isDraggingRef.current = false;
      }
      onChange(html);
    },
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  React.useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  if (!editor) return null;

  const toolbarBg = isDark ? "rgba(18,18,18,0.95)" : "rgba(255,255,255,0.85)";
  const toolbarBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const toolbarItems: ToolbarItem[] = [
    {
      label: "Cofnij (Ctrl+Z)",
      icon: <UndoIcon />,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      disabled: !editor.can().undo(),
    },
    {
      label: "Przywróć (Ctrl+Y)",
      icon: <RedoIcon />,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      disabled: !editor.can().redo(),
    },
    { divider: true },
    {
      label: "Pogrubienie",
      icon: <FormatBoldIcon />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      label: "Kursywa",
      icon: <FormatItalicIcon />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      label: "Podkreślenie",
      icon: <FormatUnderlinedIcon />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive("underline"),
    },
    { divider: true },
    {
      label: "Do lewej",
      icon: <FormatAlignLeftIcon />,
      action: () => editor.chain().focus().setTextAlign("left").run(),
      active: editor.isActive({ textAlign: "left" }),
    },
    {
      label: "Wyśrodkuj",
      icon: <FormatAlignCenterIcon />,
      action: () => editor.chain().focus().setTextAlign("center").run(),
      active: editor.isActive({ textAlign: "center" }),
    },
    {
      label: "Do prawej",
      icon: <FormatAlignRightIcon />,
      action: () => editor.chain().focus().setTextAlign("right").run(),
      active: editor.isActive({ textAlign: "right" }),
    },
    { divider: true },
    {
      label: "Lista punktowana",
      icon: <FormatListBulletedIcon />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      label: "Lista numerowana",
      icon: <FormatListNumberedIcon />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      label: "Cytat",
      icon: <FormatQuoteIcon />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
    },
  ];

  return (
    <>
      <EditorGlobalStyles />

      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          borderRadius: "24px",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.3)"
            : "0 8px 32px rgba(0,0,0,0.04)",
        }}
      >
        {!readOnly && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              px: 1,
              py: 0.5,
              borderBottom: `1px solid ${toolbarBorder}`,
              background: toolbarBg,
              backdropFilter: "blur(16px)",
              position: "sticky",
              top: 0,
              zIndex: 10,
              gap: 0.25,
            }}
          >
            {toolbarItems.map((item, i) =>
              "divider" in item ? (
                <Divider
                  key={`d-${i}`}
                  orientation="vertical"
                  flexItem
                  sx={{ mx: 0.5, my: 0.5, borderColor: toolbarBorder }}
                />
              ) : (
                <Tooltip key={item.label} title={item.label}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={item.action}
                      disabled={item.disabled ?? false}
                      sx={{
                        borderRadius: 1.5,
                        color: item.active
                          ? "primary.main"
                          : isDark
                            ? "grey.300"
                            : "grey.700",
                        bgcolor: item.active
                          ? isDark
                            ? "rgba(99,102,241,0.2)"
                            : "primary.50"
                          : "transparent",
                        "&:hover": {
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                        },
                        "&.Mui-disabled": { opacity: 0.35 },
                      }}
                    >
                      {item.icon}
                    </IconButton>
                  </span>
                </Tooltip>
              ),
            )}

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, my: 0.5, borderColor: toolbarBorder }}
            />

            <TablePicker
              onSelect={(rows, cols) =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows, cols, withHeaderRow: true })
                  .run()
              }
            />
          </Box>
        )}

        {/* ── py: 0 — padding obsługują CSS rules dla tableWrapper ── */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            bgcolor: "background.paper",
            position: "relative",
            px: 0.4,
            // Zapas na dole, żeby fixed RepromptInput nie przykrył ostatniego wiersza
            pb: !readOnly ? "110px" : undefined,
          }}
        >
          {!readOnly && (
            <>
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

              <TableBubbleMenu editor={editor} />
              <CommentBubbleMenu editor={editor} />
            </>
          )}

          <EditorContent editor={editor} />
        </Box>
      </Paper>
    </>
  );
}
