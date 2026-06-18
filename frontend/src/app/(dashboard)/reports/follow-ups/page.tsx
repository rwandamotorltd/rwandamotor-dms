"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FileDown, FileSpreadsheet, PhoneCall, PhoneOff, CalendarCheck,
  CheckCircle2, TrendingUp, Users, BarChart2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

function KpiTile({
  label, value, subtitle, icon: Icon, color,
}: {
  label: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FollowUpReportPage() {
  const [year,  setYear]  = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["report-followups", year, month],
    queryFn: () => reportsApi.getMonthlyFollowUps(year, month),
  });

  async function download(type: "pdf" | "excel") {
    setDownloading(type);
    try {
      const blob = type === "pdf"
        ? await reportsApi.downloadPdf(year, month)
        : await reportsApi.downloadExcel(year, month);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const ext  = type === "pdf" ? "pdf" : "xlsx";
      a.href     = url;
      a.download = `followup-report-${year}-${String(month).padStart(2, "0")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download report");
    } finally {
      setDownloading(null);
    }
  }

  const monthLabel = data ? format(new Date(data.year, data.month - 1, 1), "MMMM yyyy") : "";

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Monthly Follow-up Report</h1>
          {monthLabel && <p className="text-sm text-muted-foreground">{monthLabel}</p>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(v ? Number(v) : month)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(v ? Number(v) : year)}>
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => download("pdf")}
            disabled={!data || downloading !== null}
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            {downloading === "pdf" ? "Downloading…" : "PDF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => download("excel")}
            disabled={!data || downloading !== null}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            {downloading === "excel" ? "Downloading…" : "Excel"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !data ? (
        <div className="text-center py-16 text-muted-foreground">No data for this period.</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiTile label="Follow-ups Created"      value={data.totalCreated}              icon={BarChart2}     color="bg-primary" />
            <KpiTile label="Customers Reached"        value={data.totalContacted}             icon={PhoneCall}     color="bg-emerald-500" />
            <KpiTile label="No Answer"                value={data.totalNoAnswer}              icon={PhoneOff}      color="bg-orange-500" />
            <KpiTile label="Appointments Booked"      value={data.totalAppointmentsBooked}    icon={CalendarCheck} color="bg-indigo-500" />
            <KpiTile label="Appointments Completed"   value={data.totalAppointmentsCompleted} icon={CheckCircle2}  color="bg-teal-500" />
            <KpiTile label="No-shows"                 value={data.totalNoShow}               icon={Users}         color="bg-amber-500" />
            <KpiTile label="Recovered"                value={data.totalRecovered}             icon={TrendingUp}    color="bg-blue-500" />
            <KpiTile label="Contact Rate"             value={`${data.contactRate}%`}          icon={PhoneCall}     color="bg-slate-500"
              subtitle={`${data.recoveryRate}% recovery rate`}
            />
          </div>

          {/* Breakdown by Type */}
          {data.byReason.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By Follow-up Type</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Contacted</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Appointments</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Recovered</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byReason.map((row, i) => (
                        <tr key={row.reason} className={cn("border-b last:border-0", i % 2 === 0 && "bg-muted/20")}>
                          <td className="px-4 py-2.5 font-medium">{row.reason}</td>
                          <td className="text-right px-4 py-2.5">{row.total}</td>
                          <td className="text-right px-4 py-2.5">{row.contacted}</td>
                          <td className="text-right px-4 py-2.5">{row.appointments}</td>
                          <td className="text-right px-4 py-2.5 text-emerald-600 font-medium">{row.recovered}</td>
                          <td className="text-right px-4 py-2.5">{row.closed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interaction Log */}
          {data.interactionRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Interaction Log ({data.interactionRows.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Customer</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Vehicle</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Outcome</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Notes</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.interactionRows.map((row, i) => (
                        <tr key={i} className={cn("border-b last:border-0", i % 2 === 0 && "bg-muted/20")}>
                          <td className="px-4 py-2.5 font-medium truncate max-w-[120px]">{row.customerName}</td>
                          <td className="px-4 py-2.5">{row.vehiclePlate}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.reason}</td>
                          <td className="px-4 py-2.5">{row.outcome}</td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{row.notes ?? "—"}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                            {format(new Date(row.date), "dd MMM yyyy HH:mm")}
                          </td>
                          <td className="px-4 py-2.5">{row.agent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
