"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  X, Car, ExternalLink, Loader2, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { retentionApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage, formatDateDistance } from "@/lib/utils";
import type { YearWiseCohortRow, ModelWiseCohortRow, CohortVehicle } from "@/types";

const CHART_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function periodDateRange(type: "sixMonth" | "yearly" | "quarterly", calcAt: string): string {
  const now = new Date(calcAt);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (type === "sixMonth") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    return `${fmt(from)} – ${fmt(now)}`;
  }
  if (type === "yearly") {
    return `Jan 1, ${now.getFullYear()} – ${fmt(now)}`;
  }
  const qMonth = Math.floor(now.getMonth() / 3) * 3;
  const from = new Date(now.getFullYear(), qMonth, 1);
  return `${fmt(from)} – ${fmt(now)}`;
}

// ── Rate badge ────────────────────────────────────────────────────────────────
function RateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 70 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    : rate >= 40 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return (
    <span className={"inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold tabular-nums " + color}>
      {formatPercentage(rate, 1)}
    </span>
  );
}

// ── Clickable visit count cell ────────────────────────────────────────────────
function VisitCell({ count, visitBucket, onClick }: {
  count: number;
  visitBucket: "zero" | "one" | "two" | "moreThanTwo" | "visited";
  onClick: () => void;
}) {
  const isVisited = visitBucket !== "zero";
  const base =
    "inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-semibold tabular-nums transition-all " +
    (isVisited
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300");
  if (count === 0) return <span className={base}>0</span>;
  return (
    <button onClick={onClick}
      className={base + " cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current underline underline-offset-2"}
      title="Click to see these vehicles">
      {count}
    </button>
  );
}

// ── DrillTarget ───────────────────────────────────────────────────────────────
interface DrillTarget {
  serviceYear: number;
  saleYear?: number;
  modelName?: string;
  brandName?: string;
  visitBucket: string;
  label: string;
}

// ── Year selector ─────────────────────────────────────────────────────────────
function YearSelector({ selectedYear, todayYear, onChange }: {
  selectedYear: number; todayYear: number; onChange: (y: number) => void;
}) {
  const years: number[] = [];
  for (let y = todayYear; y >= todayYear - 10; y--) years.push(y);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
        Measuring visits in:
      </span>
      {years.map(y => (
        <button key={y} onClick={() => onChange(y)}
          className={"px-3 py-1 rounded-full text-xs font-semibold transition-all " +
            (y === selectedYear ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
          {y}
        </button>
      ))}
    </div>
  );
}

// ── Year-wise table ───────────────────────────────────────────────────────────
function YearWiseTable({ rows, serviceYear, onDrill }: {
  rows: YearWiseCohortRow[]; serviceYear: number; onDrill: (t: DrillTarget) => void;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-4">No data available.</p>;
  const totals = rows.reduce(
    (acc, r) => ({ totalSold: acc.totalSold + r.totalSold, zeroVisits: acc.zeroVisits + r.zeroVisits,
      oneVisit: acc.oneVisit + r.oneVisit, twoVisits: acc.twoVisits + r.twoVisits, moreThanTwo: acc.moreThanTwo + r.moreThanTwo }),
    { totalSold: 0, zeroVisits: 0, oneVisit: 0, twoVisits: 0, moreThanTwo: 0 }
  );
  const overallRate = totals.totalSold > 0 ? ((totals.totalSold - totals.zeroVisits) / totals.totalSold) * 100 : 0;
  const drill = (saleYear: number | undefined, visitBucket: DrillTarget["visitBucket"], label: string) =>
    onDrill({ serviceYear, saleYear, visitBucket, label });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Metric</th>
            {rows.map(r => (
              <th key={r.saleYear} className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">{r.saleYear}</th>
            ))}
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 font-medium text-xs text-muted-foreground whitespace-nowrap">Total Sold</td>
            {rows.map(r => (
              <td key={r.saleYear} className="py-2.5 px-3 text-center">
                <button onClick={() => drill(r.saleYear, "visited", `All retained — sold ${r.saleYear}, visits in ${serviceYear}`)}
                  className="font-semibold text-foreground hover:text-primary hover:underline tabular-nums">
                  {r.totalSold}
                </button>
              </td>
            ))}
            <td className="py-2.5 px-3 text-center font-bold text-foreground">{totals.totalSold}</td>
          </tr>
          {([
            { key: "zeroVisits" as const,  label: `0 Visits in ${serviceYear}`,  bucket: "zero" as const },
            { key: "oneVisit" as const,    label: `1 Visit in ${serviceYear}`,   bucket: "one" as const },
            { key: "twoVisits" as const,   label: `2 Visits in ${serviceYear}`,  bucket: "two" as const },
            { key: "moreThanTwo" as const, label: `2+ Visits in ${serviceYear}`, bucket: "moreThanTwo" as const },
          ] as const).map(({ key, label, bucket }) => (
            <tr key={key} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-2.5 pr-4 font-medium text-xs text-muted-foreground whitespace-nowrap">{label}</td>
              {rows.map(r => (
                <td key={r.saleYear} className="py-2.5 px-3 text-center">
                  <VisitCell count={r[key]} visitBucket={bucket}
                    onClick={() => drill(r.saleYear, bucket, `${label} — sold ${r.saleYear}`)} />
                </td>
              ))}
              <td className="py-2.5 px-3 text-center">
                <VisitCell count={totals[key]} visitBucket={bucket}
                  onClick={() => drill(undefined, bucket, `${label} — all years`)} />
              </td>
            </tr>
          ))}
          <tr className="bg-muted/20">
            <td className="py-2.5 pr-4 font-semibold text-xs text-foreground whitespace-nowrap">Retention %</td>
            {rows.map(r => <td key={r.saleYear} className="py-2.5 px-3 text-center"><RateBadge rate={r.retentionRate} /></td>)}
            <td className="py-2.5 px-3 text-center"><RateBadge rate={overallRate} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Model-wise table ──────────────────────────────────────────────────────────
function ModelWiseTable({ rows, serviceYear, onDrill }: {
  rows: ModelWiseCohortRow[]; serviceYear: number; onDrill: (t: DrillTarget) => void;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-4">No data available.</p>;
  const drill = (r: ModelWiseCohortRow, visitBucket: DrillTarget["visitBucket"], label: string) =>
    onDrill({ serviceYear, modelName: r.modelName, brandName: r.brandName, visitBucket, label });
  const tot = rows.reduce(
    (a, r) => ({ totalSold: a.totalSold + r.totalSold, zeroVisits: a.zeroVisits + r.zeroVisits,
      oneVisit: a.oneVisit + r.oneVisit, twoVisits: a.twoVisits + r.twoVisits, moreThanTwo: a.moreThanTwo + r.moreThanTwo }),
    { totalSold: 0, zeroVisits: 0, oneVisit: 0, twoVisits: 0, moreThanTwo: 0 }
  );
  const rate = tot.totalSold > 0 ? ((tot.totalSold - tot.zeroVisits) / tot.totalSold) * 100 : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Model</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Total</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">0 Visits</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">1 Visit</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">2 Visits</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">2+</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2.5 pr-4">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{r.modelName}</span>
                  <span className="text-[11px] text-muted-foreground">{r.brandName}</span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-center">
                <button onClick={() => drill(r, "visited", `All retained — ${r.brandName} ${r.modelName}, visits in ${serviceYear}`)}
                  className="font-semibold text-foreground hover:text-primary hover:underline tabular-nums">
                  {r.totalSold}
                </button>
              </td>
              <td className="py-2.5 px-3 text-center"><VisitCell count={r.zeroVisits}  visitBucket="zero"        onClick={() => drill(r, "zero",        `0 visits in ${serviceYear} — ${r.brandName} ${r.modelName}`)} /></td>
              <td className="py-2.5 px-3 text-center"><VisitCell count={r.oneVisit}    visitBucket="one"         onClick={() => drill(r, "one",         `1 visit in ${serviceYear} — ${r.brandName} ${r.modelName}`)} /></td>
              <td className="py-2.5 px-3 text-center"><VisitCell count={r.twoVisits}   visitBucket="two"         onClick={() => drill(r, "two",         `2 visits in ${serviceYear} — ${r.brandName} ${r.modelName}`)} /></td>
              <td className="py-2.5 px-3 text-center"><VisitCell count={r.moreThanTwo} visitBucket="moreThanTwo" onClick={() => drill(r, "moreThanTwo", `2+ visits in ${serviceYear} — ${r.brandName} ${r.modelName}`)} /></td>
              <td className="py-2.5 px-3 text-center"><RateBadge rate={r.retentionRate} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/20 font-semibold">
            <td className="py-2.5 pr-4 text-xs uppercase tracking-wide text-foreground">Total</td>
            <td className="py-2.5 px-3 text-center font-bold text-foreground">{tot.totalSold}</td>
            <td className="py-2.5 px-3 text-center"><VisitCell count={tot.zeroVisits}  visitBucket="zero"        onClick={() => onDrill({ serviceYear, visitBucket: "zero",        label: `0 visits in ${serviceYear} — all models` })} /></td>
            <td className="py-2.5 px-3 text-center"><VisitCell count={tot.oneVisit}    visitBucket="one"         onClick={() => onDrill({ serviceYear, visitBucket: "one",         label: `1 visit in ${serviceYear} — all models` })} /></td>
            <td className="py-2.5 px-3 text-center"><VisitCell count={tot.twoVisits}   visitBucket="two"         onClick={() => onDrill({ serviceYear, visitBucket: "two",         label: `2 visits in ${serviceYear} — all models` })} /></td>
            <td className="py-2.5 px-3 text-center"><VisitCell count={tot.moreThanTwo} visitBucket="moreThanTwo" onClick={() => onDrill({ serviceYear, visitBucket: "moreThanTwo", label: `2+ visits in ${serviceYear} — all models` })} /></td>
            <td className="py-2.5 px-3 text-center"><RateBadge rate={rate} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Drill-down slide panel ────────────────────────────────────────────────────
function DrillPanel({ target, onClose }: { target: DrillTarget; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cohort-vehicles", target],
    queryFn: () => retentionApi.getCohortVehicles({
      serviceYear: target.serviceYear, saleYear: target.saleYear,
      modelName: target.modelName, brandName: target.brandName, visitBucket: target.visitBucket,
    }),
  });
  const vehicles = data ?? [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col h-full">
          <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
            <div>
              <h3 className="font-semibold text-base text-foreground">Vehicle Drill-Down</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{target.label}</p>
              {!isLoading && (
                <p className="text-xs text-primary font-medium mt-1">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}</p>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Car className="w-10 h-10 opacity-30" />
                <p className="text-sm">No vehicles found</p>
              </div>
            ) : (
              vehicles.map(v => <VehicleRow key={v.id} v={v} serviceYear={target.serviceYear} />)
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function VehicleRow({ v, serviceYear }: { v: CohortVehicle; serviceYear: number }) {
  const visitColor = v.visitsInYear === 0
    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary font-semibold">{v.vin}</span>
          {v.plateNumber && <span className="font-mono text-xs font-bold text-foreground">{v.plateNumber}</span>}
        </div>
        <p className="text-sm text-foreground mt-0.5">{v.brandName} {v.modelName} · {v.year}</p>
        {v.customerName && (
          <p className="text-xs text-muted-foreground truncate">{v.customerName}{v.customerPhone ? ` · ${v.customerPhone}` : ""}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`rounded px-2 py-0.5 text-xs font-bold tabular-nums ${visitColor}`}>
          {v.visitsInYear} visit{v.visitsInYear !== 1 ? "s" : ""} in {serviceYear}
        </span>
        <Link href={`/vehicles/${v.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
          360° View <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function RetentionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}</div>
      <div className="grid grid-cols-2 gap-4">{[0, 1].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RetentionPage() {
  const currentCalendarYear = new Date().getFullYear();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedVisitYear, setSelectedVisitYear]   = useState(currentCalendarYear);
  const [selectedCohortYear, setSelectedCohortYear] = useState(currentCalendarYear - 1);
  const [drillTarget, setDrillTarget]               = useState<DrillTarget | null>(null);

  const canEvaluate = user?.role === "Admin" || user?.role === "TechnicalDirector";

  const { data, isLoading } = useQuery({
    queryKey: ["retention-analytics", selectedCohortYear],
    queryFn: () => retentionApi.getAnalytics({ trendMonths: 12, cohortYear: selectedCohortYear }),
    refetchInterval: 10 * 60_000,
  });

  const { data: cohortData, isLoading: cohortLoading } = useQuery({
    queryKey: ["retention-visit-cohorts", selectedVisitYear],
    queryFn: () => retentionApi.getVisitCohorts(selectedVisitYear),
    refetchInterval: 10 * 60_000,
  });

  const evaluateMut = useMutation({
    mutationFn: () => retentionApi.evaluate(),
    onSuccess: () => {
      toast.success("Fleet status updated");
      qc.invalidateQueries({ queryKey: ["retention-analytics"] });
    },
    onError: () => toast.error("Evaluation failed"),
  });

  const todayYear = cohortData?.todayYear ?? currentCalendarYear;
  const cohortYears = Array.from({ length: 6 }, (_, i) => currentCalendarYear - i);

  if (isLoading) return <RetentionSkeleton />;
  if (!data) return null;

  const periodCards = [
    { label: "6-Month Retention",   key: "sixMonth" as const,  data: data.sixMonth,  color: "#6366f1" },
    { label: "12-Month Retention",  key: "yearly" as const,    data: data.yearly,    color: "#10b981" },
    { label: "Quarterly Retention", key: "quarterly" as const, data: data.quarterly, color: "#0ea5e9" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold">Retention Analytics</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Service return rates, fleet health, and visit frequency cohorts
        </p>
      </motion.div>

      {/* ── Period KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {periodCards.map((p, i) => (
          <motion.div key={p.label} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-[80px]" style={{ background: p.color }} />

            {/* Title + rate */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.label}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {periodDateRange(p.key, p.data.calculatedAt)}
                </p>
              </div>
              <p className="text-3xl font-black shrink-0" style={{ color: p.color }}>
                {formatPercentage(p.data.retentionRate, 1)}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(Math.max(p.data.retentionRate, 0), 100)}%`, background: p.color }} />
            </div>

            {/* Stats grid */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-muted-foreground">Returned</span>
              <span className="font-semibold text-emerald-600 text-right tabular-nums">
                {p.data.returnedVehicles}
                <span className="text-muted-foreground font-normal"> / {p.data.eligibleVehicles}</span>
              </span>
              <span className="text-muted-foreground">Lost</span>
              <span className="font-semibold text-red-500 text-right tabular-nums">{p.data.lostVehicles}</span>
              <span className="text-muted-foreground">Overdue</span>
              <span className="font-semibold text-amber-500 text-right tabular-nums">{p.data.overdueVehicles}</span>
              <span className="text-muted-foreground">Due Soon</span>
              <span className="font-semibold text-blue-500 text-right tabular-nums">{p.data.dueSoonVehicles}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Fleet Status ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Fleet Status — Current</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evaluated {formatDateDistance(data.yearly.calculatedAt)} · counts reflect all dealership vehicles
            </p>
          </div>
          {canEvaluate && (
            <Button variant="outline" size="sm" onClick={() => evaluateMut.mutate()}
              disabled={evaluateMut.isPending} className="gap-1.5 text-xs h-8">
              {evaluateMut.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating…</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Evaluate Now</>}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Lost"      value={data.yearly.lostVehicles}      icon={AlertTriangle} variant="danger"  index={0} href="/vehicles?status=Lost"      />
          <KpiCard title="Overdue"   value={data.yearly.overdueVehicles}   icon={TrendingDown}  variant="warning" index={1} href="/vehicles?status=Overdue"   />
          <KpiCard title="Recovered" value={data.yearly.recoveredVehicles} icon={RefreshCw}     variant="success" index={2} href="/vehicles?status=Recovered"  />
          <KpiCard title="Due Soon"  value={data.yearly.dueSoonVehicles}   icon={TrendingUp}    variant="info"    index={3} href="/vehicles?status=DueSoon"   />
        </div>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">12-Month Retention Trend</CardTitle>
            <CardDescription>Monthly return rate vs. total eligible fleet</CardDescription>
          </CardHeader>
          <CardContent>
            {data.trend.every(p => p.retentionRate === 0) ? (
              <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingUp className="w-10 h-10 opacity-20" />
                <p className="text-sm">No service records in the last 12 months</p>
                <p className="text-xs">Retention trend will populate as vehicles return for service</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, n: any) => [n === "retentionRate" ? `${Number(v).toFixed(1)}%` : v, n === "retentionRate" ? "Retention %" : String(n)] as any}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="retentionRate" stroke="#6366f1" strokeWidth={2.5} fill="url(#retGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
                  <Bar yAxisId="right" dataKey="eligible" fill="#6366f1" fillOpacity={0.1} radius={[2, 2, 0, 0]} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By brand */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Brand Retention YTD</CardTitle>
            <CardDescription>Year-to-date return rate per brand</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byBrand.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingUp className="w-10 h-10 opacity-20" />
                <p className="text-sm">No brand data available yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.byBrand} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="brandName" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Retention Rate"]}
                  />
                  <Bar dataKey="retentionRate" radius={[0, 4, 4, 0]}>
                    {data.byBrand.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Visit Frequency cohort ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
            <div>
              <CardTitle className="text-base">Visit Frequency — By Sale Year</CardTitle>
              <CardDescription className="mt-0.5">
                How many vehicles sold each year came in for service during <strong>{selectedVisitYear}</strong>.
                Click any number to see the exact vehicles.
              </CardDescription>
            </div>
            {selectedVisitYear !== todayYear && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                Viewing {selectedVisitYear} vs current ({todayYear})
              </span>
            )}
          </div>
          <div className="mt-3">
            <YearSelector selectedYear={selectedVisitYear} todayYear={todayYear} onChange={y => setSelectedVisitYear(y)} />
          </div>
        </CardHeader>
        <CardContent>
          {cohortLoading
            ? <Skeleton className="h-40 w-full" />
            : cohortData
              ? <YearWiseTable rows={cohortData.yearWise} serviceYear={selectedVisitYear} onDrill={setDrillTarget} />
              : null}
        </CardContent>
      </Card>

      {/* Model-wise */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Visit Frequency — By Model</CardTitle>
          <CardDescription>
            Service visits in <strong>{selectedVisitYear}</strong> grouped by vehicle model.
            Click any number to see the exact vehicles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cohortLoading
            ? <Skeleton className="h-64 w-full" />
            : cohortData
              ? <ModelWiseTable rows={cohortData.modelWise} serviceYear={selectedVisitYear} onDrill={setDrillTarget} />
              : null}
        </CardContent>
      </Card>

      {/* ── Cohort Analysis ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
            <div>
              <CardTitle className="text-base">Cohort Retention Analysis</CardTitle>
              <CardDescription className="mt-0.5">
                Of vehicles sold in each quarter of <strong>{selectedCohortYear}</strong>, how many returned within 3, 6, 12, and 24 months?
              </CardDescription>
            </div>
            {/* Cohort year picker */}
            <div className="relative shrink-0">
              <select
                value={selectedCohortYear}
                onChange={e => setSelectedCohortYear(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40">
                {cohortYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.cohorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <TrendingUp className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium">No cohort data for {selectedCohortYear}</p>
              <p className="text-xs text-center max-w-xs">
                This year has no vehicles with recorded sale dates. Try selecting a different year,
                or ensure vehicles are imported with sale dates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-6 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Cohort</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Vehicles</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">3 mo</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">6 mo</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">12 mo</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">24 mo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-6 font-medium">{c.cohortLabel}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{c.totalVehicles}</td>
                      {[c.month3Rate, c.month6Rate, c.month12Rate, c.month24Rate].map((rate, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right">
                          <span className={"font-semibold tabular-nums " + (rate >= 70 ? "text-emerald-600 dark:text-emerald-400" : rate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                            {formatPercentage(rate, 1)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down panel */}
      {drillTarget && <DrillPanel target={drillTarget} onClose={() => setDrillTarget(null)} />}
    </div>
  );
}
