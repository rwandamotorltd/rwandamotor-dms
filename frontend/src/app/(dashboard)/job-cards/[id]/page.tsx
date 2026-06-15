"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobCardsApi, companySettingsApi } from "@/lib/api";
import type { CompanySettings } from "@/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Printer, ArrowRight, CheckCircle, XCircle } from "lucide-react";

// ─── Fuel bar visual ──────────────────────────────────────────────────────────

const FUEL_MAP: Record<string, number> = {
  Empty: 0, Quarter: 25, Half: 50, ThreeQuarter: 75, Full: 100,
};
const FUEL_LABELS: Record<string, string> = {
  Empty: "Empty", Quarter: "1/4", Half: "1/2", ThreeQuarter: "3/4", Full: "Full",
};

function FuelGauge({ level }: { level: string }) {
  const pct = FUEL_MAP[level] ?? 50;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden border">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct === 0 ? "#ef4444" : pct < 50 ? "#f59e0b" : "#22c55e",
          }}
        />
      </div>
      <span className="text-sm font-medium w-12">{FUEL_LABELS[level]}</span>
    </div>
  );
}

// ─── Print template (rendered offscreen, injected on demand) ─────────────────

// Accessories as shown on the PDF (short names, exact order)
const PRINT_ACCESSORIES = [
  { label: "Wheel Spanner",     key: "Spanner / Wheel Brace" },
  { label: "Jack",              key: "Jack" },
  { label: "Warning Triangle",  key: "Warning Triangle" },
  { label: "Fire Extinguisher", key: "Fire Extinguisher" },
  { label: "Spare Tyre",        key: "Spare Tyre" },
];

type JobCardData = NonNullable<ReturnType<typeof useJobCard>["data"]>;

interface PrintViewProps {
  data: JobCardData;
  settings: CompanySettings;
}

function PrintView({ data, settings }: PrintViewProps) {
  const isDelivery = data.status === "Closed" && !!data.deliveryNoteNumber;
  const docNumber  = isDelivery ? data.deliveryNoteNumber! : data.jobCardNumber;
  const docDate    = format(new Date(data.createdAt), "dd/MM/yyyy");
  const serviceLabel = data.serviceType.replace(/([A-Z])/g, " $1").trim().toUpperCase();

  // Split notes into numbered work items
  const workItems = (data.notes ?? "")
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const cell = (style?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #000", padding: "3px 6px", ...style,
  });

  const showHeader  = isDelivery ? settings.deliveryNoteShowHeader : settings.jobCardShowHeader;
  const showFooter  = isDelivery ? settings.deliveryNoteShowFooter : settings.jobCardShowFooter;

  return (
    <div
      id="job-card-print"
      style={{ fontFamily: "Arial, sans-serif", fontSize: 11, padding: 28, maxWidth: 770, margin: "0 auto", color: "#000" }}
    >
      {/* ── HEADER ─────────────────────────────────────────────── */}
      {showHeader && (
        <table style={{ width: "100%", marginBottom: 14, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              {/* Company info box */}
              <td style={{ verticalAlign: "top", width: "60%" }}>
                <div style={{ border: "1.5px solid #000", padding: "8px 12px", display: "inline-block", minWidth: 220 }}>
                  <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 3 }}>{settings.companyName.toUpperCase()}</div>
                  {settings.address   && <div style={{ fontSize: 10 }}>{settings.address}</div>}
                  {settings.phone     && <div style={{ fontSize: 10 }}>Tel: {settings.phone}</div>}
                  {settings.email     && <div style={{ fontSize: 10 }}>Email: {settings.email}</div>}
                  {settings.tinNumber && <div style={{ fontSize: 10 }}>TIN: {settings.tinNumber}</div>}
                </div>
              </td>
              {/* Date + stamp box */}
              <td style={{ verticalAlign: "top", textAlign: "right" }}>
                <div style={{ fontSize: 11, marginBottom: 6 }}>Date: <strong>{docDate}</strong></div>
                <div style={{ border: "1.5px solid #000", width: 80, height: 60, display: "inline-block" }} />
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* ── TITLE ──────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 1 }}>
          {isDelivery ? "DELIVERY NOTE N°:" : "REPAIR ORDER N°:"} {docNumber}
        </div>
        <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 2 }}>{serviceLabel}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1.5px solid #000", margin: "8px 0" }} />

      {/* ── WORK ITEMS ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        {workItems.length > 0
          ? workItems.map((item, i) => (
              <div key={i} style={{ marginBottom: 3 }}>{i + 1}. {item}</div>
            ))
          : [1, 2, 3].map(i => (
              <div key={i} style={{ marginBottom: 8, borderBottom: "1px dotted #aaa", minHeight: 18 }}>&nbsp;</div>
            ))
        }
      </div>

      {/* Other work section */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: "bold", fontSize: 10, marginBottom: 4 }}>
          OTHER WORK DEEMED NECESSARY BY THE CLIENT AT THE WORKSHOP:
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ borderBottom: "1px dotted #aaa", minHeight: 16, marginBottom: 5 }}>&nbsp;</div>
        ))}
      </div>

      {/* ── CLIENT + VEHICLE INFO ──────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr>
            <th colSpan={4} style={{ ...cell({ background: "#f0f0f0", fontWeight: "bold", textAlign: "left", fontSize: 10 }) }}>
              CLIENT INFORMATION
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell({ fontWeight: "bold", width: "16%", fontSize: 10 })}>Name / Contact</td>
            <td style={cell({ width: "34%" })}>{data.customerName ?? "—"} {data.customerPhone ? `/ ${data.customerPhone}` : ""}</td>
            <td style={cell({ fontWeight: "bold", width: "16%", fontSize: 10 })}>Address / Email</td>
            <td style={cell({ width: "34%" })}>—</td>
          </tr>
        </tbody>
      </table>

      {/* Vehicle info + accessories side by side */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            {/* Left: Vehicle info */}
            <td style={{ width: "60%", verticalAlign: "top", paddingRight: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th colSpan={4} style={cell({ background: "#f0f0f0", fontWeight: "bold", textAlign: "left", fontSize: 10 })}>
                      VEHICLE INFORMATION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Brand",    data.brandName],
                    ["Model",    data.modelName],
                    ["VIN",      data.vin],
                    ["Plate N°", data.plateNumber ?? "—"],
                    ["Year",     String(data.year)],
                    ["Fuel",     `${(data.fuelType ?? "—")} — ${FUEL_LABELS[data.fuelLevel] ?? data.fuelLevel}`],
                    ["Mileage",  `${data.mileage.toLocaleString()} km`],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={cell({ fontWeight: "bold", width: "38%", fontSize: 10 })}>{k}</td>
                      <td style={cell({ fontSize: 10 })}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>

            {/* Right: Accessories */}
            <td style={{ width: "40%", verticalAlign: "top", paddingLeft: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th colSpan={2} style={cell({ background: "#f0f0f0", fontWeight: "bold", textAlign: "left", fontSize: 10 })}>
                      ACCESSORIES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PRINT_ACCESSORIES.map(({ label, key }) => {
                    const present = data.accessoriesPresent.includes(key);
                    return (
                      <tr key={key}>
                        <td style={cell({ width: "24px", textAlign: "center", fontSize: 13 })}>
                          {present ? "☒" : "☐"}
                        </td>
                        <td style={cell({ fontSize: 10 })}>{label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── REMARKS ────────────────────────────────────────────── */}
      {data.additionalInfo && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: "bold", fontSize: 10, marginBottom: 3 }}>REMARKS:</div>
          <div style={{ fontSize: 10 }}>{data.additionalInfo}</div>
        </div>
      )}
      {!data.additionalInfo && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: "bold", fontSize: 10, marginBottom: 3 }}>REMARKS:</div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ borderBottom: "1px dotted #aaa", minHeight: 14, marginBottom: 4 }}>&nbsp;</div>
          ))}
        </div>
      )}

      {/* ── SIGNATURES ─────────────────────────────────────────── */}
      <table style={{ width: "100%", marginTop: 20 }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", paddingRight: 16, verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: 4, marginTop: 30 }}>
                <div style={{ fontWeight: "bold", fontSize: 10 }}>Authorized By / Name &amp; Signature</div>
              </div>
            </td>
            <td style={{ width: "50%", paddingLeft: 16, verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: 4, marginTop: 30 }}>
                <div style={{ fontWeight: "bold", fontSize: 10 }}>Received By: {data.receivedByName}</div>
                {data.status === "Closed" && data.closedByName && (
                  <div style={{ fontSize: 10, color: "#444" }}>Closed by: {data.closedByName}</div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      {showFooter && settings.footerDisclaimer && (
        <div style={{ marginTop: 16, borderTop: "1px solid #000", paddingTop: 6, fontSize: 9, textAlign: "center", color: "#333" }}>
          {settings.footerDisclaimer}
        </div>
      )}
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useJobCard(id: string) {
  return useQuery({
    queryKey: ["job-card", id],
    queryFn: () => jobCardsApi.get(id),
    enabled: !!id,
  });
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printJobCard(jobCardNumber: string) {
  const el = document.getElementById("job-card-print");
  if (!el) return;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${jobCardNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: Arial, sans-serif; font-size: 12px; }
    @page { margin: 1cm; size: A4 portrait; }
  </style>
</head>
<body>${el.innerHTML}</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useJobCard(id);

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => companySettingsApi.get(),
  });

  // Auto-print if ?print=1
  useEffect(() => {
    if (searchParams.get("print") === "1" && data && companySettings) {
      setTimeout(() => printJobCard(data.jobCardNumber), 400);
    }
  }, [searchParams, data, companySettings]);

  const convertMutation = useMutation({
    mutationFn: () => jobCardsApi.convertToDeliveryNote(id),
    onSuccess: (res) => {
      toast.success(`Delivery note ${res.data} created. Job card closed.`);
      queryClient.invalidateQueries({ queryKey: ["job-card", id] });
      queryClient.invalidateQueries({ queryKey: ["job-cards"] });
      // Invalidate vehicle 360 so service history refreshes immediately
      if (data?.vehicleId) {
        queryClient.invalidateQueries({ queryKey: ["vehicle-360", data.vehicleId] });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Conversion failed"),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8 text-muted-foreground">Job card not found</div>;

  const accessories_all = [
    "Jack","Spare Tyre","Spanner / Wheel Brace","Fire Extinguisher",
    "Warning Triangle","First Aid Kit","Reflective Vest","Tool Kit",
    "Owner's Manual","Locking Wheel Nut Key",
  ];

  return (
    <>
      {/* Off-screen print template — rendered to DOM so we can extract innerHTML */}
      <div
        ref={printRef}
        aria-hidden="true"
        style={{ position: "absolute", left: -9999, top: 0, width: 770, pointerEvents: "none" }}
      >
        <PrintView
          data={data}
          settings={companySettings ?? {
            companyName: "RwandaMotor",
            address: null, phone: null, email: null, tinNumber: null, website: null,
            jobCardShowHeader: true, jobCardShowFooter: true,
            deliveryNoteShowHeader: true, deliveryNoteShowFooter: true,
            footerDisclaimer: "RwandaMotor declines all responsibility for materials not listed above.",
          }}
        />
      </div>

      {/* Screen view */}
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold font-mono">{data.jobCardNumber}</h1>
              <p className="text-muted-foreground text-sm">
                {data.status === "Closed" && data.deliveryNoteNumber
                  ? `Delivery Note: ${data.deliveryNoteNumber}`
                  : "Open Job Card"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => printJobCard(data.jobCardNumber)}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            {data.status === "Open" && (
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={convertMutation.isPending}
                onClick={() => {
                  if (confirm(`Convert ${data.jobCardNumber} to a Delivery Note? This will close it permanently.`)) {
                    convertMutation.mutate();
                  }
                }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {convertMutation.isPending ? "Converting…" : "Convert to Delivery Note"}
              </Button>
            )}
          </div>
        </div>

        {/* Status banner */}
        {data.status === "Closed" && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Delivery Note issued: <span className="font-mono">{data.deliveryNoteNumber}</span>
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-500">
                Closed by {data.closedByName} on {data.closedAt ? format(new Date(data.closedAt), "dd MMM yyyy HH:mm") : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vehicle Info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Vehicle</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["VIN", data.vin],
                ["Plate", data.plateNumber ?? "—"],
                ["Make / Model", `${data.brandName} ${data.modelName}`],
                ["Year", data.year],
                ["Colour", data.color ?? "—"],
                ["Transmission", data.transmission ?? "—"],
                ["Fuel Type", data.fuelType ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1">Fuel Level</p>
                <FuelGauge level={data.fuelLevel} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mileage In</span>
                <span className="font-medium">{data.mileage.toLocaleString()} km</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer + Service */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Customer & Service</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Customer", data.customerName ?? "—"],
                ["Phone", data.customerPhone ?? "—"],
                ["Service Type", data.serviceType.replace(/([A-Z])/g, " $1").trim()],
                ["Technician", data.technicianName ?? "Unassigned"],
                ["Received By", data.receivedByName],
                ["Date", format(new Date(data.createdAt), "dd MMM yyyy HH:mm")],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
              {data.serviceType === "PDI" && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-3 py-2 text-blue-700 dark:text-blue-300 text-xs mt-2">
                  PDI — Conversion will auto-create a Sales History entry
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accessories */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-base">Accessories Checklist</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {accessories_all.map(acc => {
                  const present = data.accessoriesPresent.includes(acc);
                  return (
                    <div key={acc} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${present ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" : "border-dashed text-muted-foreground"}`}>
                      {present
                        ? <CheckCircle className="w-4 h-4 shrink-0" />
                        : <XCircle className="w-4 h-4 shrink-0 opacity-30" />}
                      {acc}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(data.notes || data.additionalInfo) && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.notes && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p>{data.notes}</p>
                  </div>
                )}
                {data.additionalInfo && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Additional Info</p>
                    <p>{data.additionalInfo}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer signature */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="border-t-2 border-foreground/30 pt-3 mt-10">
                  <p className="font-semibold text-sm">Customer Signature</p>
                  <p className="text-xs text-muted-foreground mt-1">I confirm the vehicle condition above is accurate</p>
                </div>
              </div>
              <div>
                <div className="border-t-2 border-foreground/30 pt-3 mt-10">
                  <p className="font-semibold text-sm">Received By: {data.receivedByName}</p>
                  <p className="text-xs text-muted-foreground mt-1">RwandaMotor Service Advisor</p>
                  {data.status === "Closed" && data.closedByName && (
                    <p className="text-xs text-muted-foreground">Closed by: {data.closedByName}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
