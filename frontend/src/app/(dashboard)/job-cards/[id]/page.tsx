"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobCardsApi } from "@/lib/api";
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

function PrintView({ data }: { data: NonNullable<ReturnType<typeof useJobCard>["data"]> }) {
  const accessories_all = [
    "Jack","Spare Tyre","Spanner / Wheel Brace","Fire Extinguisher",
    "Warning Triangle","First Aid Kit","Reflective Vest","Tool Kit",
    "Owner's Manual","Locking Wheel Nut Key",
  ];

  return (
    <div
      id="job-card-print"
      style={{ fontFamily: "Arial, sans-serif", fontSize: 12, padding: 32, maxWidth: 750, margin: "0 auto" }}
    >
      {/* Header */}
      <table style={{ width: "100%", marginBottom: 16 }}>
        <tbody>
          <tr>
            <td>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>RWANDAMOTOR</h1>
              <p style={{ margin: 0, color: "#555" }}>Customer Service Reception Record</p>
            </td>
            <td style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "monospace" }}>
                {data.status === "Closed" && data.deliveryNoteNumber
                  ? data.deliveryNoteNumber
                  : data.jobCardNumber}
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>
                {data.status === "Closed" ? "DELIVERY NOTE" : "JOB CARD"}
              </div>
              <div style={{ fontSize: 11 }}>{format(new Date(data.createdAt), "dd MMM yyyy")}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      {/* Vehicle Info */}
      <h3 style={{ marginBottom: 6 }}>Vehicle Information</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <tbody>
          {[
            ["VIN", data.vin], ["Plate Number", data.plateNumber ?? "—"],
            ["Year", data.year], ["Colour", data.color ?? "—"],
            ["Make / Model", `${data.brandName} ${data.modelName}`],
            ["Transmission", data.transmission ?? "—"], ["Fuel Type", data.fuelType ?? "—"],
            ["Fuel Level", FUEL_LABELS[data.fuelLevel] ?? data.fuelLevel],
            ["Mileage In (km)", data.mileage.toLocaleString()],
          ].reduce<[string, string | number][][]>((rows, item, i) =>
            i % 2 === 0 ? [...rows, [item as [string, string | number]]] : [...rows.slice(0, -1), [...rows[rows.length - 1], item as [string, string | number]]],
          []).map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#f9f9f9" : "#fff" }}>
              {row.map(([label, val], ci) => (
                <>
                  <td key={`${ri}-${ci}-l`} style={{ padding: "4px 8px", fontWeight: "bold", width: "20%", border: "1px solid #ddd" }}>{label}</td>
                  <td key={`${ri}-${ci}-v`} style={{ padding: "4px 8px", width: "30%", border: "1px solid #ddd" }}>{val}</td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Customer Info */}
      <h3 style={{ marginBottom: 6 }}>Customer Information</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <tbody>
          <tr style={{ background: "#f9f9f9" }}>
            <td style={{ padding: "4px 8px", fontWeight: "bold", width: "20%", border: "1px solid #ddd" }}>Name</td>
            <td style={{ padding: "4px 8px", border: "1px solid #ddd" }}>{data.customerName ?? "—"}</td>
            <td style={{ padding: "4px 8px", fontWeight: "bold", width: "20%", border: "1px solid #ddd" }}>Phone</td>
            <td style={{ padding: "4px 8px", border: "1px solid #ddd" }}>{data.customerPhone ?? "—"}</td>
          </tr>
        </tbody>
      </table>

      {/* Accessories */}
      <h3 style={{ marginBottom: 6 }}>Accessories Checklist</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <tbody>
          {accessories_all.reduce<string[][]>((rows, acc, i) =>
            i % 2 === 0 ? [...rows, [acc]] : [...rows.slice(0, -1), [...rows[rows.length - 1], acc]],
          []).map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#f9f9f9" : "#fff" }}>
              {row.map((acc, ci) => {
                const present = data.accessoriesPresent.includes(acc);
                return (
                  <>
                    <td key={`${ri}-${ci}-c`} style={{ padding: "4px 8px", border: "1px solid #ddd", width: "6%", textAlign: "center" }}>
                      {present ? "☑" : "☐"}
                    </td>
                    <td key={`${ri}-${ci}-n`} style={{ padding: "4px 8px", border: "1px solid #ddd", width: "44%" }}>{acc}</td>
                  </>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Service + Notes */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <tbody>
          <tr style={{ background: "#f9f9f9" }}>
            <td style={{ padding: "4px 8px", fontWeight: "bold", width: "20%", border: "1px solid #ddd" }}>Service Type</td>
            <td style={{ padding: "4px 8px", border: "1px solid #ddd" }}>{data.serviceType.replace(/([A-Z])/g, " $1").trim()}</td>
            <td style={{ padding: "4px 8px", fontWeight: "bold", width: "20%", border: "1px solid #ddd" }}>Technician</td>
            <td style={{ padding: "4px 8px", border: "1px solid #ddd" }}>{data.technicianName ?? "Unassigned"}</td>
          </tr>
          {data.notes && (
            <tr>
              <td style={{ padding: "4px 8px", fontWeight: "bold", border: "1px solid #ddd" }}>Notes</td>
              <td colSpan={3} style={{ padding: "4px 8px", border: "1px solid #ddd" }}>{data.notes}</td>
            </tr>
          )}
          {data.additionalInfo && (
            <tr style={{ background: "#f9f9f9" }}>
              <td style={{ padding: "4px 8px", fontWeight: "bold", border: "1px solid #ddd" }}>Additional Info</td>
              <td colSpan={3} style={{ padding: "4px 8px", border: "1px solid #ddd" }}>{data.additionalInfo}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signature */}
      <table style={{ width: "100%", marginTop: 32 }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", paddingRight: 16 }}>
              <div style={{ borderTop: "2px solid #000", paddingTop: 4, marginTop: 32 }}>
                <div style={{ fontWeight: "bold" }}>Customer Signature</div>
                <div style={{ color: "#555", fontSize: 11 }}>I confirm the vehicle condition above is accurate</div>
              </div>
            </td>
            <td style={{ width: "50%", paddingLeft: 16 }}>
              <div style={{ borderTop: "2px solid #000", paddingTop: 4, marginTop: 32 }}>
                <div style={{ fontWeight: "bold" }}>Received By: {data.receivedByName}</div>
                <div style={{ color: "#555", fontSize: 11 }}>RwandaMotor Service Advisor</div>
                {data.status === "Closed" && data.closedByName && (
                  <div style={{ color: "#555", fontSize: 11 }}>Closed by: {data.closedByName}</div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 24, borderTop: "1px solid #ddd", paddingTop: 8, color: "#888", fontSize: 10, textAlign: "center" }}>
        RwandaMotor — Customer Service Reception Record · {data.jobCardNumber}
        {data.deliveryNoteNumber ? ` · Delivery Note: ${data.deliveryNoteNumber}` : ""}
      </div>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useJobCard(id);

  // Auto-print if ?print=1
  useEffect(() => {
    if (searchParams.get("print") === "1" && data) {
      setTimeout(() => window.print(), 300);
    }
  }, [searchParams, data]);

  const convertMutation = useMutation({
    mutationFn: () => jobCardsApi.convertToDeliveryNote(id),
    onSuccess: (res) => {
      toast.success(`Delivery note ${res.data} created. Job card closed.`);
      queryClient.invalidateQueries({ queryKey: ["job-card", id] });
      queryClient.invalidateQueries({ queryKey: ["job-cards"] });
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
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #job-card-print { display: block !important; }
        }
        #job-card-print { display: none; }
      `}</style>

      {/* Hidden print output */}
      <div ref={printRef}><PrintView data={data} /></div>

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
            <Button variant="outline" size="sm" onClick={() => window.print()}>
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
                <p className="text-sm text-muted-foreground mb-1">Customer Signature</p>
                <div className="border-b border-dashed border-muted-foreground h-12" />
                <p className="text-xs text-muted-foreground mt-1">{data.customerName ?? "Customer"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Service Advisor</p>
                <div className="border-b border-dashed border-muted-foreground h-12" />
                <p className="text-xs font-medium mt-1">{data.receivedByName}</p>
                <p className="text-xs text-muted-foreground">RwandaMotor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
