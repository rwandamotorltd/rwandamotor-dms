"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Rnd } from "react-rnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Save, Plus, Trash2, Eye, EyeOff, Grid3X3,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type,
  Minus, Table2, Star, RotateCcw, Copy, Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { templatesApi } from "@/lib/api";
import {
  type TemplateField, type FieldDef,
  FIELD_REGISTRY, DOCUMENT_TYPE_LABELS,
} from "@/types/templates";

// ── Canvas constants ─────────────────────────────────────────────────────────
const A4_W = 794;
const A4_H = 1123;
const GRID = 8;

// ── Sample data for preview mode ─────────────────────────────────────────────
const SAMPLE_DATA: Record<string, string> = {
  "jobCard.number":        "OR-2026-0042",
  "jobCard.date":          "24 Jun 2026",
  "jobCard.completedDate": "24 Jun 2026",
  "jobCard.status":        "Completed",
  "jobCard.serviceType":   "Full Service",
  "jobCard.description":   "Full service including oil change, filter replacement, brake inspection and tyre rotation.",
  "jobCard.laborCost":     "25,000 RWF",
  "jobCard.partsCost":     "48,000 RWF",
  "jobCard.discount":      "5,000 RWF",
  "jobCard.vatAmount":     "6,800 RWF",
  "jobCard.totalCost":     "74,800 RWF",
  "vehicle.plateNumber":   "RAD 123 A",
  "vehicle.vin":           "JT3HN86R0W0123456",
  "vehicle.brand":         "Toyota",
  "vehicle.model":         "Land Cruiser",
  "vehicle.year":          "2022",
  "vehicle.color":         "Pearl White",
  "vehicle.mileage":       "42,500 km",
  "vehicle.fuelLevel":     "3/4",
  "customer.name":         "Jean Paul Habimana",
  "customer.phone":        "+250 788 123 456",
  "customer.email":        "jean@example.com",
  "customer.address":      "KG 15 Ave, Kigali",
  "technician.name":       "Eric Nshimiye",
  "company.name":          "Rwandamotor Ltd",
  "company.address":       "KN 5 Rd, Kigali, Rwanda",
  "company.phone":         "+250 788 300 000",
  "company.email":         "service@rwandamotor.com",
  "company.tin":           "102-345-678",
  "company.website":       "www.rwandamotor.com",
  "deliveryNote.number":   "DN-2026-0042",
  "deliveryNote.date":     "24 Jun 2026",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function resolveValue(field: TemplateField): string {
  if (field.type === "label") return field.label;
  if (field.type === "line" || field.type === "table") return "";
  return SAMPLE_DATA[field.fieldKey] ?? `{${field.fieldKey}}`;
}

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ── Rendered field (canvas + preview) ────────────────────────────────────────
function RenderField({ field, preview }: { field: TemplateField; preview: boolean }) {
  if (field.type === "line") {
    return <div style={{ width: "100%", height: 2, background: field.color || "#000", marginTop: field.h / 2 - 1 }} />;
  }
  if (field.type === "table") {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: field.fontSize }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            {["#", "Description", "Qty", "Unit Price", "Total"].map(h => (
              <th key={h} style={{ border: "1px solid #ccc", padding: "4px 8px", textAlign: h === "#" ? "center" : "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview
            ? [["1", "Engine Oil 5W-30 (5L)", "1", "12,000", "12,000"],
               ["2", "Oil Filter", "1",  "3,500",  "3,500"],
               ["3", "Labour – Full Service", "1", "25,000", "25,000"]].map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ border: "1px solid #ccc", padding: "4px 8px", textAlign: j === 0 ? "center" : "left" }}>{cell}</td>
                ))}
              </tr>
            ))
            : <tr><td colSpan={5} style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", color: "#999" }}>Line items will appear here</td></tr>
          }
        </tbody>
      </table>
    );
  }
  return (
    <div style={{
      width: "100%", height: "100%", overflow: "hidden",
      fontSize: field.fontSize,
      fontWeight: field.fontWeight,
      fontStyle: field.fontStyle,
      textAlign: field.textAlign,
      color: field.color,
      lineHeight: 1.3,
      whiteSpace: "pre-wrap",
    }}>
      {resolveValue(field)}
    </div>
  );
}

// ── Properties panel ─────────────────────────────────────────────────────────
function PropertiesPanel({
  field, onChange, onDelete, onDuplicate,
}: {
  field: TemplateField;
  onChange: (patch: Partial<TemplateField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Properties</p>
        <div className="flex gap-1">
          <button onClick={onDuplicate} title="Duplicate" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} title="Delete" className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {field.type === "label" && (
        <div className="space-y-1">
          <Label className="text-xs">Text</Label>
          <Input value={field.label} onChange={e => onChange({ label: e.target.value })} className="h-7 text-xs" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">X (px)</Label><Input type="number" value={field.x} onChange={e => onChange({ x: +e.target.value })} className="h-7 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Y (px)</Label><Input type="number" value={field.y} onChange={e => onChange({ y: +e.target.value })} className="h-7 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">W (px)</Label><Input type="number" value={field.w} onChange={e => onChange({ w: +e.target.value })} className="h-7 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">H (px)</Label><Input type="number" value={field.h} onChange={e => onChange({ h: +e.target.value })} className="h-7 text-xs" /></div>
      </div>

      {field.type !== "line" && field.type !== "table" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Font size</Label>
            <Input type="number" min={6} max={72} value={field.fontSize}
              onChange={e => onChange({ fontSize: +e.target.value })} className="h-7 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Style</Label>
            <div className="flex gap-1">
              <button onClick={() => onChange({ fontWeight: field.fontWeight === "bold" ? "normal" : "bold" })}
                className={cn("p-1.5 rounded border transition-colors", field.fontWeight === "bold" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                <Bold className="w-3 h-3" />
              </button>
              <button onClick={() => onChange({ fontStyle: field.fontStyle === "italic" ? "normal" : "italic" })}
                className={cn("p-1.5 rounded border transition-colors", field.fontStyle === "italic" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                <Italic className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Alignment</Label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map(a => (
                <button key={a} onClick={() => onChange({ textAlign: a })}
                  className={cn("p-1.5 rounded border transition-colors", field.textAlign === a ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                  {a === "left" ? <AlignLeft className="w-3 h-3" /> : a === "center" ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={field.color} onChange={e => onChange({ color: e.target.value })}
                className="w-8 h-7 rounded border border-border cursor-pointer" />
              <Input value={field.color} onChange={e => onChange({ color: e.target.value })} className="h-7 text-xs flex-1" />
            </div>
          </div>
        </>
      )}

      {field.type === "line" && (
        <div className="space-y-1">
          <Label className="text-xs">Line color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={field.color} onChange={e => onChange({ color: e.target.value })}
              className="w-8 h-7 rounded border border-border cursor-pointer" />
            <Input value={field.color} onChange={e => onChange({ color: e.target.value })} className="h-7 text-xs flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────
export default function TemplateEditorPage() {
  const params = useParams<{ documentType: string }>();
  const router = useRouter();
  const qc     = useQueryClient();
  const docType = params.documentType;
  const fieldDefs = FIELD_REGISTRY[docType] ?? [];
  const docLabel  = DOCUMENT_TYPE_LABELS[docType] ?? docType;

  const [templateId,    setTemplateId]  = useState<string | null>(null);
  const [templateName,  setTemplateName] = useState(`${docLabel} Template`);
  const [fields,        setFields]       = useState<TemplateField[]>([]);
  const [selectedId,    setSelectedId]   = useState<string | null>(null);
  const [preview,       setPreview]      = useState(false);
  const [showGrid,      setShowGrid]     = useState(true);
  const [zoom,          setZoom]         = useState(0.85);
  const [isDefault,     setIsDefault]    = useState(true);
  const [dirty,         setDirty]        = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load existing template
  const { data: templates } = useQuery({
    queryKey: ["templates", docType],
    queryFn: () => templatesApi.list(docType),
  });

  useEffect(() => {
    if (!templates) return;
    const def = templates.find(t => t.isDefault) ?? templates[0];
    if (!def) return;
    setTemplateId(def.id);
    setTemplateName(def.name);
    setIsDefault(def.isDefault);
    try { setFields(JSON.parse(def.fieldsJson)); } catch { setFields([]); }
    setDirty(false);
  }, [templates]);

  const saveMutation = useMutation({
    mutationFn: () => templatesApi.save({
      id: templateId,
      documentType: docType,
      name: templateName,
      pageWidth: A4_W,
      pageHeight: A4_H,
      fieldsJson: JSON.stringify(fields),
      isDefault,
    }),
    onSuccess: (data) => {
      setTemplateId(data.id);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template saved");
    },
    onError: () => toast.error("Failed to save template"),
  });

  const selectedField = fields.find(f => f.id === selectedId) ?? null;

  const updateField = useCallback((id: string, patch: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
    setDirty(true);
  }, []);

  const addField = (def: FieldDef) => {
    const canvas = canvasRef.current;
    const cx = canvas ? Math.round((canvas.scrollLeft + 80) / GRID) * GRID : 40;
    const cy = canvas ? Math.round((canvas.scrollTop + 80) / GRID) * GRID : 40;
    const newField: TemplateField = {
      id:         newId(),
      fieldKey:   def.key,
      label:      def.label,
      x:          cx,
      y:          cy,
      w:          def.defaultW ?? 200,
      h:          def.defaultH ?? 24,
      fontSize:   12,
      fontWeight: "normal",
      fontStyle:  "normal",
      textAlign:  "left",
      color:      "#000000",
      type:       def.type ?? "field",
    };
    setFields(prev => [...prev, newField]);
    setSelectedId(newField.id);
    setDirty(true);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setFields(prev => prev.filter(f => f.id !== selectedId));
    setSelectedId(null);
    setDirty(true);
  };

  const duplicateSelected = () => {
    if (!selectedField) return;
    const dup: TemplateField = { ...selectedField, id: newId(), x: selectedField.x + 16, y: selectedField.y + 16 };
    setFields(prev => [...prev, dup]);
    setSelectedId(dup.id);
    setDirty(true);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${templateName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${A4_W}px; height: ${A4_H}px; position: relative; background: white; }
  @page { size: A4 portrait; margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
${fields.map(f => {
  if (f.type === "line") return `<div style="position:absolute;left:${f.x}px;top:${f.y}px;width:${f.w}px;height:2px;background:${f.color}"></div>`;
  const val = resolveValue(f);
  return `<div style="position:absolute;left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;font-size:${f.fontSize}px;font-weight:${f.fontWeight};font-style:${f.fontStyle};text-align:${f.textAlign};color:${f.color};overflow:hidden;line-height:1.3;white-space:pre-wrap">${val}</div>`;
}).join("")}
<script>window.onload = () => { window.print(); window.close(); }</script>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const groups = groupBy(fieldDefs, d => d.group);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <header className="h-12 border-b border-border bg-background flex items-center gap-3 px-4 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Badge variant="outline" className="text-xs">{docLabel}</Badge>
        <Input
          value={templateName}
          onChange={e => { setTemplateName(e.target.value); setDirty(true); }}
          className="h-7 w-48 text-sm"
        />
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}

        <div className="flex-1" />

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded" />
          Default
        </label>

        <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden">
          {[0.6, 0.75, 0.85, 1].map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={cn("px-2 py-1 text-xs transition-colors", zoom === z ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
              {Math.round(z * 100)}%
            </button>
          ))}
        </div>

        <button onClick={() => setShowGrid(v => !v)} title="Toggle grid"
          className={cn("p-1.5 rounded border transition-colors", showGrid ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
          <Grid3X3 className="w-4 h-4" />
        </button>

        <button onClick={() => setPreview(v => !v)} title="Toggle preview"
          className={cn("p-1.5 rounded border transition-colors", preview ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-600" : "border-border text-muted-foreground hover:bg-muted")}>
          {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Print preview
        </Button>

        <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="gap-1.5 gradient-primary text-white">
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Field palette ──────────────────────────────────────── */}
        <aside className="w-52 shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fields</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Click to add to canvas</p>
          </div>
          <div className="p-2 space-y-3">
            {Object.entries(groups).map(([group, defs]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">{group}</p>
                <div className="space-y-0.5">
                  {defs.map(def => (
                    <button key={def.key} onClick={() => addField(def)}
                      className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors flex items-center gap-2">
                      {def.type === "line"  ? <Minus className="w-3 h-3 text-muted-foreground shrink-0" />
                       : def.type === "table" ? <Table2 className="w-3 h-3 text-muted-foreground shrink-0" />
                       : def.type === "label" ? <Type className="w-3 h-3 text-muted-foreground shrink-0" />
                       : <span className="w-3 h-3 rounded-sm bg-primary/20 shrink-0" />}
                      <span className="truncate">{def.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Center: Canvas ───────────────────────────────────────────── */}
        <main
          ref={canvasRef}
          className="flex-1 overflow-auto bg-muted/40 flex items-start justify-center p-8"
          onClick={() => setSelectedId(null)}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            <div
              style={{
                position: "relative",
                width: A4_W,
                height: A4_H,
                background: "white",
                boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                backgroundImage: showGrid && !preview
                  ? `linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
                     linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)`
                  : undefined,
                backgroundSize: showGrid && !preview ? `${GRID}px ${GRID}px` : undefined,
              }}
              onClick={e => e.stopPropagation()}
            >
              {fields.map(field => (
                preview ? (
                  <div key={field.id} style={{ position: "absolute", left: field.x, top: field.y, width: field.w, height: field.h }}>
                    <RenderField field={field} preview={preview} />
                  </div>
                ) : (
                  <Rnd
                    key={field.id}
                    position={{ x: field.x, y: field.y }}
                    size={{ width: field.w, height: field.h }}
                    bounds="parent"
                    dragGrid={[GRID, GRID]}
                    resizeGrid={[GRID, GRID]}
                    minWidth={GRID * 4}
                    minHeight={GRID}
                    onMouseDown={e => { e.stopPropagation(); setSelectedId(field.id); }}
                    onDragStop={(_, d) => updateField(field.id, { x: Math.round(d.x / GRID) * GRID, y: Math.round(d.y / GRID) * GRID })}
                    onResizeStop={(_, __, ref, ___, pos) => updateField(field.id, {
                      w: Math.round(ref.offsetWidth / GRID) * GRID,
                      h: Math.round(ref.offsetHeight / GRID) * GRID,
                      x: Math.round(pos.x / GRID) * GRID,
                      y: Math.round(pos.y / GRID) * GRID,
                    })}
                    style={{ zIndex: selectedId === field.id ? 10 : 1 }}
                  >
                    <div
                      className={cn(
                        "w-full h-full select-none cursor-move",
                        selectedId === field.id
                          ? "outline outline-2 outline-primary outline-offset-1"
                          : "hover:outline hover:outline-1 hover:outline-primary/40 hover:outline-offset-1"
                      )}
                    >
                      <RenderField field={field} preview={false} />
                    </div>
                  </Rnd>
                )
              ))}
            </div>
          </div>
        </main>

        {/* ── Right: Properties panel ──────────────────────────────────── */}
        <aside className="w-52 shrink-0 border-l border-border bg-muted/20">
          {selectedField && !preview ? (
            <PropertiesPanel
              field={selectedField}
              onChange={patch => updateField(selectedField.id, patch)}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
            />
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground mt-8 space-y-1">
              <p className="font-medium">{preview ? "Preview mode" : "No field selected"}</p>
              <p>{preview ? "Toggle preview off to edit" : "Click a field to edit its properties"}</p>
              {!preview && (
                <>
                  <Separator className="my-3" />
                  <p className="text-[10px]">{fields.length} field{fields.length !== 1 ? "s" : ""} on canvas</p>
                  {fields.length > 0 && (
                    <button onClick={() => { if (confirm("Clear all fields?")) { setFields([]); setSelectedId(null); setDirty(true); } }}
                      className="mt-2 text-destructive hover:underline text-[10px] flex items-center gap-1 mx-auto">
                      <RotateCcw className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
