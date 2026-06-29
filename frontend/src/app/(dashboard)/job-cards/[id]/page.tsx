"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobCardsApi, companySettingsApi, techniciansApi } from "@/lib/api";
import type { CompanySettings, ServiceType, FuelLevel } from "@/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useServiceTypes } from "@/hooks/use-service-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Printer, ArrowRight, CheckCircle, XCircle, Pencil, X, Save } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

// SERVICE_TYPES now comes from useServiceTypes() inside components

const FUEL_LEVELS: FuelLevel[] = ["Empty","Quarter","Half","ThreeQuarter","Full"];

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

// ─── Delivery Note Print (separate layout) ────────────────────────────────────

function DeliveryPrintView({ data, settings }: PrintViewProps) {
  const docNumber    = data.deliveryNoteNumber!;
  const deliveryDate = data.closedAt ? format(new Date(data.closedAt), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
  const receiptDate  = format(new Date(data.createdAt), "dd/MM/yyyy");

  const workItems = (data.notes ?? "")
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const cell = (style?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #000", padding: "3px 6px", ...style,
  });

  const th = (style?: React.CSSProperties): React.CSSProperties => ({
    ...cell({ background: "#f0f0f0", fontWeight: "bold", textAlign: "left", fontSize: 10, ...style }),
  });

  return (
    <div
      id="job-card-print"
      style={{ fontFamily: "Arial, sans-serif", fontSize: 11, padding: 28, maxWidth: 770, margin: "0 auto", color: "#000" }}
    >
      {/* HEADER */}
      {settings.deliveryNoteShowHeader && (
        <table style={{ width: "100%", marginBottom: 14, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "60%" }}>
                <div style={{ border: "1.5px solid #000", padding: "8px 12px", display: "inline-block", minWidth: 220 }}>
                  <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 3 }}>{settings.companyName.toUpperCase()}</div>
                  {settings.address   && <div style={{ fontSize: 10 }}>{settings.address}</div>}
                  {settings.phone     && <div style={{ fontSize: 10 }}>Tel: {settings.phone}</div>}
                  {settings.email     && <div style={{ fontSize: 10 }}>Email: {settings.email}</div>}
                  {settings.tinNumber && <div style={{ fontSize: 10 }}>TIN: {settings.tinNumber}</div>}
                </div>
              </td>
              <td style={{ verticalAlign: "top", textAlign: "right" }}>
                <div style={{ fontSize: 11, marginBottom: 3 }}>Date: <strong>{deliveryDate}</strong></div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>Job Card: {data.jobCardNumber}</div>
                <div style={{ border: "1.5px solid #000", width: 80, height: 60, display: "inline-block" }} />
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* TITLE */}
      <div style={{ textAlign: "center", marginBottom: 10, borderBottom: "2px solid #000", paddingBottom: 8 }}>
        <div style={{ fontSize: 17, fontWeight: "bold", letterSpacing: 2 }}>VEHICLE DELIVERY NOTE</div>
        <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 2 }}>N°: {docNumber}</div>
      </div>

      {/* CLIENT + VEHICLE side by side */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            {/* Client */}
            <td style={{ width: "50%", verticalAlign: "top", paddingRight: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th colSpan={2} style={th()}>CLIENT INFORMATION</th></tr></thead>
                <tbody>
                  {[
                    ["Name",    data.customerName ?? "—"],
                    ["Phone",   data.customerPhone ?? "—"],
                    ["Email",   data.customerEmail ?? "—"],
                    ["Address", data.customerAddress ?? "—"],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={cell({ fontWeight: "bold", width: "38%", fontSize: 10 })}>{k}</td>
                      <td style={cell({ fontSize: 10 })}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>

            {/* Vehicle */}
            <td style={{ width: "50%", verticalAlign: "top", paddingLeft: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th colSpan={2} style={th()}>VEHICLE DETAILS</th></tr></thead>
                <tbody>
                  {[
                    ["Brand",     data.brandName],
                    ["Model",     data.modelName],
                    ["Year",      String(data.year)],
                    ["VIN",       data.vin],
                    ["Plate N°",  data.plateNumber ?? "—"],
                    ["Mileage",   `${data.mileage.toLocaleString()} km`],
                    ["Fuel",      FUEL_LABELS[data.fuelLevel] ?? data.fuelLevel],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={cell({ fontWeight: "bold", width: "38%", fontSize: 10 })}>{k}</td>
                      <td style={cell({ fontSize: 10 })}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* WORK COMPLETED */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead><tr><th colSpan={2} style={th({ fontSize: 10 })}>WORK COMPLETED</th></tr></thead>
        <tbody>
          {workItems.length > 0
            ? workItems.map((item, i) => (
                <tr key={i}>
                  <td style={cell({ width: 24, textAlign: "center", fontSize: 10 })}>{i + 1}.</td>
                  <td style={cell({ fontSize: 10 })}>{item}</td>
                </tr>
              ))
            : [1, 2, 3, 4].map(i => (
                <tr key={i}>
                  <td style={cell({ width: 24, textAlign: "center", fontSize: 10 })}>{i}.</td>
                  <td style={cell({ minHeight: 16, fontSize: 10 })}>&nbsp;</td>
                </tr>
              ))
          }
        </tbody>
      </table>

      {/* ACCESSORIES RETURNED */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr><th colSpan={10} style={th({ fontSize: 10 })}>ACCESSORIES RETURNED WITH VEHICLE</th></tr>
        </thead>
        <tbody>
          <tr>
            {PRINT_ACCESSORIES.map(({ label, key }) => {
              const present = data.accessoriesPresent.includes(key);
              return (
                <td key={key} style={cell({ textAlign: "center", width: `${100 / PRINT_ACCESSORIES.length}%`, fontSize: 10 })}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{present ? "☒" : "☐"}</div>
                  <div>{label}</div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {/* ACKNOWLEDGMENT */}
      <div style={{ border: "1px solid #000", padding: "8px 12px", marginBottom: 14, background: "#fafafa" }}>
        <div style={{ fontWeight: "bold", fontSize: 10, marginBottom: 4 }}>ACKNOWLEDGMENT OF VEHICLE RECEIPT</div>
        <div style={{ fontSize: 10, lineHeight: 1.6 }}>
          I, the undersigned, confirm that the above-described vehicle has been collected and returned to me in satisfactory condition.
          All work items listed above have been completed to my satisfaction. I acknowledge receipt of the vehicle and all accessories noted above.
        </div>
      </div>

      {/* SIGNATURES */}
      <table style={{ width: "100%", marginTop: 12 }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", paddingRight: 20, verticalAlign: "bottom" }}>
              <div style={{ fontSize: 10, marginBottom: 4 }}>Customer Name: ___________________________</div>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: 4, marginTop: 24 }}>
                <div style={{ fontWeight: "bold", fontSize: 10 }}>Customer Signature &amp; Date</div>
              </div>
            </td>
            <td style={{ width: "50%", paddingLeft: 20, verticalAlign: "bottom" }}>
              <div style={{ fontSize: 10, marginBottom: 4 }}>Date of Delivery: <strong>{deliveryDate}</strong></div>
              <div style={{ fontSize: 10, marginBottom: 4 }}>Job Card Date: {receiptDate}</div>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: 4, marginTop: 10 }}>
                <div style={{ fontWeight: "bold", fontSize: 10 }}>Released By: {data.receivedByName}</div>
                {data.closedByName && (
                  <div style={{ fontSize: 10, color: "#444" }}>Closed by: {data.closedByName}</div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* FOOTER */}
      {settings.deliveryNoteShowFooter && settings.footerDisclaimer && (
        <div style={{ marginTop: 16, borderTop: "1px solid #000", paddingTop: 6, fontSize: 9, textAlign: "center", color: "#333" }}>
          {settings.footerDisclaimer}
        </div>
      )}
    </div>
  );
}

// ─── Job Card Print (repair order) ────────────────────────────────────────────

function PrintView({ data, settings }: PrintViewProps) {
  if (data.status === "Closed" && !!data.deliveryNoteNumber)
    return <DeliveryPrintView data={data} settings={settings} />;

  const docNumber    = data.jobCardNumber;
  const docDate      = format(new Date(data.createdAt), "dd/MM/yyyy");
  const serviceLabel = data.serviceType.replace(/([A-Z])/g, " $1").trim().toUpperCase();

  const workItems = (data.notes ?? "")
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const cell = (style?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #000", padding: "3px 6px", ...style,
  });

  const showHeader = settings.jobCardShowHeader;
  const showFooter = settings.jobCardShowFooter;

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
          REPAIR ORDER N°: {docNumber}
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
            <td style={cell({ fontWeight: "bold", width: "16%", fontSize: 10 })}>Client Name</td>
            <td style={cell({ width: "34%", fontSize: 10 })}>{data.customerName ?? "—"}</td>
            <td style={cell({ fontWeight: "bold", width: "16%", fontSize: 10 })}>Phone</td>
            <td style={cell({ width: "34%", fontSize: 10 })}>{data.customerPhone ?? "—"}</td>
          </tr>
          <tr>
            <td style={cell({ fontWeight: "bold", width: "16%", fontSize: 10 })}>Address</td>
            <td style={cell({ width: "34%", fontSize: 10 })}>{data.customerAddress ?? "—"}</td>
            <td style={cell({ fontWeight: "bold", width: "16%", fontSize: 10 })}>Email</td>
            <td style={cell({ width: "34%", fontSize: 10 })}>{data.customerEmail ?? "—"}</td>
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

function printJobCard() {
  const el = document.getElementById("job-card-print");
  if (!el) return;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title></title>
  <style>
    * { box-sizing: border-box; }
    /* margin:0 removes the browser's header/footer margin area (date, URL, page number) */
    @page { margin: 0; size: A4 portrait; }
    body { margin: 0; padding: 14mm 12mm; font-family: Arial, sans-serif; font-size: 12px; }
  </style>
</head>
<body>${el.innerHTML}</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface EditForm {
  serviceType: ServiceType;
  technicianId: string | null;
  fuelLevel: FuelLevel;
  mileage: number;
  notes: string;
  additionalInfo: string;
  accessoriesPresent: string[];
}

export default function JobCardDetailPage() {
  return (
    <Suspense>
      <JobCardDetailContent />
    </Suspense>
  );
}

function JobCardDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canPrint   = hasPermission("jobCards.print");
  const canEdit    = hasPermission("jobCards.edit");
  const canConvert = hasPermission("jobCards.convert");
  const printRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const { data, isLoading } = useJobCard(id);

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => companySettingsApi.get(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => techniciansApi.list(),
  });

  const serviceTypes = useServiceTypes();

  // Auto-print if ?print=1
  useEffect(() => {
    if (searchParams.get("print") === "1" && data && companySettings) {
      setTimeout(() => printJobCard(), 400);
    }
  }, [searchParams, data, companySettings]);

  const convertMutation = useMutation({
    mutationFn: () => jobCardsApi.convertToDeliveryNote(id),
    onSuccess: (res) => {
      toast.success(`Delivery note ${res.data} created. Job card closed.`);
      queryClient.invalidateQueries({ queryKey: ["job-card", id] });
      queryClient.invalidateQueries({ queryKey: ["job-cards"] });
      if (data?.vehicleId) {
        queryClient.invalidateQueries({ queryKey: ["vehicle-360", data.vehicleId] });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Conversion failed"),
  });

  const updateMutation = useMutation({
    mutationFn: () => jobCardsApi.update({
      id,
      serviceType: editForm!.serviceType,
      technicianId: editForm!.technicianId || null,
      fuelLevel: editForm!.fuelLevel,
      mileage: editForm!.mileage,
      notes: editForm!.notes || null,
      additionalInfo: editForm!.additionalInfo || null,
      accessoriesPresent: editForm!.accessoriesPresent,
    }),
    onSuccess: () => {
      toast.success("Job card updated");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["job-card", id] });
    },
    onError: () => toast.error("Failed to update job card"),
  });

  function startEdit() {
    if (!data) return;
    setEditForm({
      serviceType: data.serviceType,
      technicianId: data.technicianId ?? null,
      fuelLevel: data.fuelLevel,
      mileage: data.mileage,
      notes: data.notes ?? "",
      additionalInfo: data.additionalInfo ?? "",
      accessoriesPresent: [...data.accessoriesPresent],
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditForm(null);
  }

  function toggleAccessory(acc: string) {
    if (!editForm) return;
    setEditForm(f => f ? ({
      ...f,
      accessoriesPresent: f.accessoriesPresent.includes(acc)
        ? f.accessoriesPresent.filter(a => a !== acc)
        : [...f.accessoriesPresent, acc],
    }) : f);
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8 text-muted-foreground">Job card not found</div>;

  const accessories_all = [
    "Jack","Spare Tyre","Spanner / Wheel Brace","Fire Extinguisher",
    "Warning Triangle","First Aid Kit","Reflective Vest","Tool Kit",
    "Owner's Manual","Locking Wheel Nut Key",
  ];

  const ef = editForm;

  return (
    <>
      {/* Off-screen print template */}
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
            emailJobCardMessage: null, emailDeliveryNoteMessage: null,
            serviceTypesConfig: null,
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
                  : isEditing ? "Editing…" : "Open Job Card"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={updateMutation.isPending}>
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                {canPrint && (
                  <Button variant="outline" size="sm" onClick={() => printJobCard()}>
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                )}
                {data.status === "Open" && (
                  <>
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={startEdit}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    )}
                    {canConvert && (
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        disabled={convertMutation.isPending}
                        onClick={() => setShowConvertDialog(true)}
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        {convertMutation.isPending ? "Converting…" : "Convert to Delivery Note"}
                      </Button>
                    )}
                  </>
                )}
              </>
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
          {/* Vehicle Info — always read-only */}
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
              {isEditing && ef ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Fuel Level</Label>
                    <Select value={ef.fuelLevel} onValueChange={v => setEditForm(f => f ? { ...f, fuelLevel: v as FuelLevel } : f)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FUEL_LEVELS.map(l => <SelectItem key={l} value={l}>{FUEL_LABELS[l]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mileage In (km)</Label>
                    <Input
                      type="number" className="h-8 text-sm"
                      value={ef.mileage}
                      onChange={e => setEditForm(f => f ? { ...f, mileage: parseInt(e.target.value) || 0 } : f)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-muted-foreground mb-1">Fuel Level</p>
                    <FuelGauge level={data.fuelLevel} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mileage In</span>
                    <span className="font-medium">{data.mileage.toLocaleString()} km</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer + Service */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Customer & Service</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {/* Customer info always read-only */}
              {[
                ["Customer", data.customerName ?? "—"],
                ["Phone", data.customerPhone ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
              <Separator />
              {isEditing && ef ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Service Type</Label>
                    <Select value={ef.serviceType} onValueChange={v => setEditForm(f => f ? { ...f, serviceType: v as ServiceType } : f)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Technician</Label>
                    <Select value={ef.technicianId ?? "none"} onValueChange={v => setEditForm(f => f ? { ...f, technicianId: v === "none" ? null : v } : f)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {technicians.filter((t: { isActive: boolean }) => t.isActive).map((t: { id: string; fullName: string }) => (
                          <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  {[
                    ["Service Type", data.serviceType.replace(/([A-Z])/g, " $1").trim()],
                    ["Technician", data.technicianName ?? "Unassigned"],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                </>
              )}
              {[
                ["Received By", data.receivedByName],
                ["Date", format(new Date(data.createdAt), "dd MMM yyyy HH:mm")],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
              {(isEditing ? ef?.serviceType === "PDI" : data.serviceType === "PDI") && (
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
                  const present = isEditing && ef
                    ? ef.accessoriesPresent.includes(acc)
                    : data.accessoriesPresent.includes(acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => toggleAccessory(acc)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors
                        ${present
                          ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                          : "border-dashed text-muted-foreground"}
                        ${isEditing ? "cursor-pointer hover:border-primary" : "cursor-default"}`}
                    >
                      {present
                        ? <CheckCircle className="w-4 h-4 shrink-0" />
                        : <XCircle className="w-4 h-4 shrink-0 opacity-30" />}
                      {acc}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {isEditing && ef ? (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes / Work Done</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                    value={ef.notes}
                    onChange={e => setEditForm(f => f ? { ...f, notes: e.target.value } : f)}
                    placeholder="Describe work performed (one item per line for clean print output)…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Additional Info / Remarks</Label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                    value={ef.additionalInfo}
                    onChange={e => setEditForm(f => f ? { ...f, additionalInfo: e.target.value } : f)}
                    placeholder="Additional remarks…"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (data.notes || data.additionalInfo) ? (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.notes && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p className="whitespace-pre-wrap">{data.notes}</p>
                  </div>
                )}
                {data.additionalInfo && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Additional Info</p>
                    <p className="whitespace-pre-wrap">{data.additionalInfo}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
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

      {/* Convert to Delivery Note — confirmation dialog */}
      {showConvertDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConvertDialog(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              {/* Icon + title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Convert to Delivery Note?</h2>
                  <p className="text-sm text-muted-foreground font-mono">{data.jobCardNumber}</p>
                </div>
              </div>

              {/* What will happen */}
              <div className="rounded-lg bg-muted/60 border border-border p-4 space-y-1.5 text-sm">
                <p className="font-medium text-foreground mb-2">This action will:</p>
                <div className="space-y-1 text-muted-foreground text-xs">
                  <p>✓ Close this job card permanently</p>
                  <p>✓ Issue delivery note <span className="font-mono font-medium text-foreground">{"DN" + data.jobCardNumber.slice(2)}</span></p>
                  <p>✓ Auto-create a service record</p>
                  <p>✓ Update vehicle next service dates</p>
                  {data.serviceType === "PDI" && (
                    <p className="text-blue-600 dark:text-blue-400">✓ Create sales history entry (PDI delivery)</p>
                  )}
                  {data.serviceType === "PDI" && (
                    <p className="text-blue-600 dark:text-blue-400">✓ Schedule a welcome call follow-up (7 days)</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">This cannot be undone. The job card will be permanently closed.</p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowConvertDialog(false)} disabled={convertMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={convertMutation.isPending}
                  onClick={() => {
                    setShowConvertDialog(false);
                    convertMutation.mutate();
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {convertMutation.isPending ? "Converting…" : "Yes, Convert"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
