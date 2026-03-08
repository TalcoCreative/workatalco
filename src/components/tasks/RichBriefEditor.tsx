import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Table as TableIcon, Type, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

// Block types for the rich brief
export type BriefBlockType = "text" | "table";

export interface TextBlock {
  type: "text";
  content: string;
}

export interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

export type BriefBlock = TextBlock | TableBlock;

// Legacy format from EditableTaskTable
interface LegacyTableData {
  headers: string[];
  rows: string[][];
}

export interface RichBriefData {
  blocks: BriefBlock[];
}

// Convert legacy table_data to RichBriefData
export function convertLegacyToRichBrief(tableData: LegacyTableData | null, description?: string | null): RichBriefData {
  const blocks: BriefBlock[] = [];

  // If there's description text, add as first text block
  if (description && description.trim()) {
    blocks.push({ type: "text", content: description.trim() });
  }

  // If there's table data with actual content (not just empty default)
  if (tableData && tableData.headers && tableData.rows) {
    const hasContent = tableData.rows.some(row => row.some((cell, i) => i > 0 && cell.trim() !== ""));
    if (hasContent) {
      blocks.push({ type: "table", headers: tableData.headers, rows: tableData.rows });
    }
  }

  // If nothing, start with empty text block
  if (blocks.length === 0) {
    blocks.push({ type: "text", content: "" });
  }

  return { blocks };
}

// Check if data is already in rich brief format
export function isRichBriefData(data: any): data is RichBriefData {
  return data && Array.isArray(data.blocks);
}

// Parse stored data (could be legacy or rich format)
export function parseTaskBriefData(tableData: any, description?: string | null): RichBriefData {
  if (isRichBriefData(tableData)) {
    return tableData;
  }
  return convertLegacyToRichBrief(tableData as LegacyTableData | null, description);
}

// Extract plain text summary for display
export function getBriefPlainText(data: RichBriefData): string {
  return data.blocks
    .filter(b => b.type === "text")
    .map(b => (b as TextBlock).content)
    .filter(Boolean)
    .join("\n");
}

const DEFAULT_TABLE: TableBlock = {
  type: "table",
  headers: ["No", "Item", "Keterangan", "Status"],
  rows: [["1", "", "", ""]],
};

interface RichBriefEditorProps {
  data: RichBriefData;
  onChange: (data: RichBriefData) => void;
  readOnly?: boolean;
}

export function RichBriefEditor({ data, onChange, readOnly = false }: RichBriefEditorProps) {
  const updateBlock = useCallback((index: number, block: BriefBlock) => {
    const newBlocks = [...data.blocks];
    newBlocks[index] = block;
    onChange({ blocks: newBlocks });
  }, [data, onChange]);

  const removeBlock = useCallback((index: number) => {
    if (data.blocks.length <= 1) return;
    const newBlocks = data.blocks.filter((_, i) => i !== index);
    onChange({ blocks: newBlocks });
  }, [data, onChange]);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.blocks.length) return;
    const newBlocks = [...data.blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange({ blocks: newBlocks });
  }, [data, onChange]);

  const addTextBlock = useCallback(() => {
    onChange({ blocks: [...data.blocks, { type: "text", content: "" }] });
  }, [data, onChange]);

  const addTableBlock = useCallback(() => {
    onChange({ blocks: [...data.blocks, { ...DEFAULT_TABLE, rows: [["1", "", "", ""]] }] });
  }, [data, onChange]);

  return (
    <div className="space-y-3">
      {data.blocks.map((block, index) => (
        <div key={index} className="group relative">
          {!readOnly && data.blocks.length > 1 && (
            <div className="absolute -left-8 top-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => moveBlock(index, -1)} className="p-0.5 hover:bg-muted rounded" disabled={index === 0}>
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              </button>
              <button type="button" onClick={() => moveBlock(index, 1)} className="p-0.5 hover:bg-muted rounded" disabled={index === data.blocks.length - 1}>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )}

          {block.type === "text" ? (
            <TextBlockEditor
              block={block}
              onChange={(b) => updateBlock(index, b)}
              readOnly={readOnly}
            />
          ) : (
            <TableBlockEditor
              block={block}
              onChange={(b) => updateBlock(index, b)}
              readOnly={readOnly}
            />
          )}

          {!readOnly && data.blocks.length > 1 && (
            <button
              type="button"
              onClick={() => removeBlock(index)}
              className="absolute -right-2 -top-2 p-1 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {!readOnly && (
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={addTextBlock} className="text-xs gap-1.5">
            <Type className="h-3.5 w-3.5" /> Tambah Teks
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addTableBlock} className="text-xs gap-1.5">
            <TableIcon className="h-3.5 w-3.5" /> Tambah Tabel
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Text Block ──
function TextBlockEditor({ block, onChange, readOnly }: { block: TextBlock; onChange: (b: TextBlock) => void; readOnly: boolean }) {
  if (readOnly) {
    if (!block.content.trim()) return null;
    return <p className="text-sm text-foreground whitespace-pre-wrap">{block.content}</p>;
  }
  return (
    <Textarea
      value={block.content}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      placeholder="Tulis deskripsi, instruksi, atau catatan..."
      rows={3}
      className="resize-none text-sm"
    />
  );
}

// ── Table Block ──
function TableBlockEditor({ block, onChange, readOnly }: { block: TableBlock; onChange: (b: TableBlock) => void; readOnly: boolean }) {
  const handleHeaderChange = (index: number, value: string) => {
    if (index === 0) return; // No column always auto
    const newHeaders = [...block.headers];
    newHeaders[index] = value;
    onChange({ ...block, headers: newHeaders });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = block.rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const newRow = [...row];
        newRow[colIndex] = value;
        return newRow;
      }
      return row;
    });
    onChange({ ...block, rows: newRows });
  };

  const addRow = () => {
    const newRowNumber = String(block.rows.length + 1);
    const newRow = Array(block.headers.length).fill("").map((_, i) => i === 0 ? newRowNumber : "");
    onChange({ ...block, rows: [...block.rows, newRow] });
  };

  const removeRow = (index: number) => {
    if (block.rows.length <= 1) return;
    const newRows = block.rows.filter((_, i) => i !== index).map((row, i) => {
      const newRow = [...row];
      newRow[0] = String(i + 1);
      return newRow;
    });
    onChange({ ...block, rows: newRows });
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {block.headers.map((header, idx) => (
                <th key={idx} className={`p-2 text-left font-medium ${idx === 0 ? 'w-12' : ''}`}>
                  {readOnly || idx === 0 ? (
                    <span className="text-xs text-muted-foreground">{header}</span>
                  ) : (
                    <Input
                      value={header}
                      onChange={(e) => handleHeaderChange(idx, e.target.value)}
                      className="h-7 text-xs font-medium bg-transparent border-0 p-0 focus-visible:ring-0"
                    />
                  )}
                </th>
              ))}
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-t border-border/50">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="p-1.5">
                    {readOnly ? (
                      <span className="text-xs px-1">{cell}</span>
                    ) : colIdx === 0 ? (
                      <span className="text-xs text-muted-foreground px-1">{cell}</span>
                    ) : (
                      <Input
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        className="h-7 text-xs bg-transparent border-0 p-1 focus-visible:ring-1"
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="p-1">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIdx)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                      disabled={block.rows.length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="border-t p-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={addRow} className="w-full text-xs gap-1 h-7">
            <Plus className="h-3 w-3" /> Tambah Baris
          </Button>
        </div>
      )}
    </div>
  );
}
