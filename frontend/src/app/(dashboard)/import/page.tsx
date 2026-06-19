"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Download, ArrowRight, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ImportType } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { importApi, type ValidateImportResult } from "@/lib/api";

type ImportStep = "select" | "upload" | "preview" | "importing" | "done";

const IMPORT_TYPES: { value: ImportType; label: string; description: string }[] = [
  {
    value: "Vehicles",
    label: "Vehicle Sales Data",
    description: "Import vehicle records — VIN, brand, model, year, customer, and sale date.",
  },
  {
    value: "Customers",
    label: "Customer Records",
    description: "Import customer profiles with contact details and categories.",
  },
  {
    value: "ServiceRecords",
    label: "Service History",
    description: "Import past service records — VIN, service date, mileage, type, and technician. Vehicles not in the system are automatically created as External.",
  },
  {
    value: "JobCards",
    label: "Historical Job Cards",
    description: "Import job cards from a previous system. Vehicles not in the system are automatically created as External.",
  },
];

const CSV_TEMPLATES: Record<ImportType, string[]> = {
  Vehicles: [
    "VIN", "PlateNumber", "BrandName", "ModelName",
    "Year", "Color", "CustomerName", "CustomerPhone", "SaleDate",
  ],
  Customers: ["FullName", "Phone", "Email", "Address", "City", "Category", "CompanyName"],
  ServiceRecords: [
    "VIN", "ServiceDate", "MileageAtService",
    "ServiceType", "TechnicianName", "InvoiceNumber",
  ],
  JobCards: [
    "VIN", "JobCardDate", "Mileage", "ServiceType",
    "FuelLevel", "TechnicianName", "Status", "Notes",
    "JobCardNumber", "CustomerName", "CustomerPhone",
  ],
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Error Table Component ─────────────────────────────────────────────────

interface ImportRowError {
  rowNumber: number;
  field: string;
  error: string;
}

function ErrorTable({
  errors,
  showAll,
  onToggleAll,
}: {
  errors: ImportRowError[];
  showAll: boolean;
  onToggleAll: () => void;
}) {
  const visible = showAll ? errors : errors.slice(0, 5);
  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-red-200 dark:border-red-800">
        <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {errors.length} row error{errors.length !== 1 ? "s" : ""}
        </p>
        {errors.length > 5 && (
          <button
            onClick={onToggleAll}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 flex items-center gap-1 transition-colors"
          >
            {showAll
              ? <><ChevronUp className="w-3 h-3" /> Show less</>
              : <><ChevronDown className="w-3 h-3" /> Show all {errors.length}</>
            }
          </button>
        )}
      </div>
      {/* Rows */}
      <div className={"overflow-y-auto transition-all " + (showAll ? "max-h-64" : "max-h-32")}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-red-50 dark:bg-red-950/30">
            <tr>
              <th className="text-left px-3 py-1.5 font-semibold text-red-700 dark:text-red-400 w-16">Row</th>
              <th className="text-left px-3 py-1.5 font-semibold text-red-700 dark:text-red-400 w-28">Field</th>
              <th className="text-left px-3 py-1.5 font-semibold text-red-700 dark:text-red-400">Error</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e, i) => (
              <tr
                key={i}
                className={"border-t border-red-100 dark:border-red-900/50 " + (i % 2 === 0 ? "" : "bg-red-50/50 dark:bg-red-950/10")}
              >
                <td className="px-3 py-1.5 font-mono text-red-600 dark:text-red-500">{e.rowNumber}</td>
                <td className="px-3 py-1.5 font-mono text-red-600 dark:text-red-500 truncate max-w-[7rem]">{e.field || "—"}</td>
                <td className="px-3 py-1.5 text-red-600 dark:text-red-500">{e.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && errors.length > 5 && (
        <div className="px-3 py-1.5 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-red-400 italic">
            Showing 5 of {errors.length} errors — click &quot;Show all&quot; to expand
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<ImportStep>("select");
  const [importType, setImportType] = useState<ImportType | "">("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const [validateResult, setValidateResult] = useState<ValidateImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: number;
    duplicates: number;
    errorDetails?: ImportRowError[];
  } | null>(null);

  const [showAllValidateErrors, setShowAllValidateErrors] = useState(false);
  const [showAllImportErrors, setShowAllImportErrors] = useState(false);

  useEffect(() => {
    if (user?.role === "TechnicalDirector") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user?.role === "TechnicalDirector") return null;

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setValidateError(null);
    setValidateResult(null);
    setIsValidating(true);
    setStep("preview");

    try {
      const base64 = await readFileAsBase64(file);
      const result = await importApi.validate(file.name, base64, importType as string);
      setValidateResult(result);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      const msg = errData?.detail ?? errData?.message ?? (err as { message?: string })?.message ?? "Failed to read file.";
      setValidateError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!validateResult) return;
    setStep("importing");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90));
    }, 200);

    try {
      const result = await importApi.process(validateResult.importLogId);
      clearInterval(interval);
      setProgress(100);
      setImportResult({
        imported: result.importedRows,
        errors: result.errorRows,
        duplicates: result.duplicateRows,
        errorDetails: result.errors ?? [],
      });
      setStep("done");
    } catch (err: unknown) {
      clearInterval(interval);
      const errData = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      const msg = errData?.detail ?? errData?.message ?? (err as { message?: string })?.message ?? "Import failed.";
      setValidateError(msg);
      setStep("preview");
    }
  };

  const downloadTemplate = () => {
    if (!importType) return;
    const headers = CSV_TEMPLATES[importType as ImportType];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = importType.toLowerCase() + "_template.csv";
    a.click();
  };

  const reset = () => {
    setStep("select");
    setSelectedFile(null);
    setProgress(0);
    setImportResult(null);
    setImportType("");
    setValidateResult(null);
    setValidateError(null);
    setShowAllValidateErrors(false);
    setShowAllImportErrors(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const validRows = validateResult?.validRows ?? 0;
  const errorRows = validateResult?.errorRows ?? 0;
  const duplicateRows = validateResult?.duplicateRows ?? 0;
  const previewRows = validateResult?.preview ?? [];

  const STEPS: ImportStep[] = ["select", "upload", "preview", "importing", "done"];

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold">Import Center</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Bulk import vehicle sales data, customer records, and service history
        </p>
      </motion.div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isActive = step === s;
          const isPast = STEPS.indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                isActive ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" :
                isPast ? "bg-emerald-500 text-white" :
                "bg-muted text-muted-foreground"
              ].join(" ")}>
                {isPast ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < 4 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          );
        })}
        <span className="ml-2 text-sm text-muted-foreground capitalize">{step}</span>
      </div>

      <AnimatePresence mode="wait">
        {step === "select" && (
          <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <p className="text-sm font-medium">What would you like to import?</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {IMPORT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setImportType(t.value)}
                  className={[
                    "text-left rounded-xl border p-5 transition-all hover:shadow-md",
                    importType === t.value
                      ? "border-primary bg-primary/5 shadow-sm shadow-primary/20"
                      : "border-border bg-card hover:border-primary/50"
                  ].join(" ")}
                >
                  <FileSpreadsheet className={["w-8 h-8 mb-3", importType === t.value ? "text-primary" : "text-muted-foreground"].join(" ")} />
                  <p className="font-semibold text-sm text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </button>
              ))}
            </div>

            {importType && (
              <div className="space-y-3 pt-2">
                <div className="rounded-lg bg-muted/50 p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Expected columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CSV_TEMPLATES[importType as ImportType].map(col => (
                      <span key={col} className="px-2 py-0.5 rounded-full bg-background border border-border text-xs font-mono text-foreground">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => setStep("upload")}>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-1.5" />
                    Download Template
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Upload your file</p>
              <Badge variant="secondary">{importType}</Badge>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={[
                "rounded-xl border-2 border-dashed cursor-pointer transition-all p-12 flex flex-col items-center gap-4",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              ].join(" ")}
            >
              <div className={["w-16 h-16 rounded-2xl flex items-center justify-center transition-all", isDragging ? "bg-primary/10" : "bg-muted"].join(" ")}>
                <Upload className={["w-8 h-8", isDragging ? "text-primary" : "text-muted-foreground"].join(" ")} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Drop your file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse — CSV or Excel (.xlsx) accepted</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1.5" /> Download Template
              </Button>
            </div>
          </motion.div>
        )}

        {step === "preview" && (
          <motion.div key="preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            {isValidating && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Validating {selectedFile?.name}…</p>
              </div>
            )}

            {!isValidating && validateError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Validation failed</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{validateError}</p>
                </div>
              </div>
            )}

            {!isValidating && validateResult && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Validation Preview</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedFile?.name} · {validateResult.totalRows} rows detected
                      {validateResult.totalRows > 10 && " · showing first 10"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">{validRows} valid</Badge>
                    {duplicateRows > 0 && <Badge variant="outline" className="text-amber-600 border-amber-300">{duplicateRows} duplicate</Badge>}
                    {errorRows > 0 && <Badge variant="destructive">{errorRows} error</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-4 bg-emerald-50 dark:bg-emerald-950/50">
                    <p className="text-2xl font-bold text-emerald-600">{validRows}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Valid Rows</p>
                  </div>
                  <div className="rounded-lg p-4 bg-amber-50 dark:bg-amber-950/50">
                    <p className="text-2xl font-bold text-amber-600">{duplicateRows}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Duplicates</p>
                  </div>
                  <div className="rounded-lg p-4 bg-red-50 dark:bg-red-950/50">
                    <p className="text-2xl font-bold text-red-600">{errorRows}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Errors</p>
                  </div>
                </div>

                {validateResult.errors.length > 0 && (
                  <ErrorTable
                    errors={validateResult.errors}
                    showAll={showAllValidateErrors}
                    onToggleAll={() => setShowAllValidateErrors(v => !v)}
                  />
                )}

                {previewRows.length > 0 && (
                  <Card>
                    <CardContent className="pt-4 overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground w-12">#</th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground">Status</th>
                            {Object.keys(previewRows[0]?.data ?? {}).map(k => (
                              <th key={k} className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map(row => {
                            const rowClass = !row.isValid
                              ? "border-b border-border/50 bg-red-50/50 dark:bg-red-950/20"
                              : row.isDuplicate
                              ? "border-b border-border/50 bg-amber-50/50 dark:bg-amber-950/20"
                              : "border-b border-border/50";
                            return (
                              <tr key={row.rowNumber} className={rowClass}>
                                <td className="py-2 pr-3 text-muted-foreground font-mono">{row.rowNumber}</td>
                                <td className="py-2 pr-3">
                                  {!row.isValid ? (
                                    <span className="flex items-center gap-1 text-xs text-red-600">
                                      <AlertCircle className="w-3.5 h-3.5" /> {row.error}
                                    </span>
                                  ) : row.isDuplicate ? (
                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                      <AlertCircle className="w-3.5 h-3.5" /> Duplicate
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                                    </span>
                                  )}
                                </td>
                                {Object.values(row.data).map((v, vi) => (
                                  <td key={vi} className="py-2 pr-3 font-mono text-xs text-foreground">
                                    {v || <span className="text-red-400">empty</span>}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              {!isValidating && validateResult && (
                <Button onClick={handleImport} disabled={validRows === 0}>
                  Import {validRows} valid row{validRows !== 1 ? "s" : ""}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {step === "importing" && (
          <motion.div key="importing" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Importing data…</p>
              <p className="text-muted-foreground text-sm mt-1">Writing records to the database</p>
            </div>
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground mt-2">{progress}%</p>
            </div>
          </motion.div>
        )}

        {step === "done" && importResult && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-xl">Import Complete</p>
              <p className="text-muted-foreground text-sm mt-1">
                Successfully imported{" "}
                <span className="font-semibold text-foreground">{importResult.imported} records</span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{importResult.duplicates}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
            {importResult.errorDetails && importResult.errorDetails.length > 0 && (
              <div className="w-full">
                <ErrorTable
                  errors={importResult.errorDetails}
                  showAll={showAllImportErrors}
                  onToggleAll={() => setShowAllImportErrors(v => !v)}
                />
              </div>
            )}
            <Button onClick={reset}>Import More</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
