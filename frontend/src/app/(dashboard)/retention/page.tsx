"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  X, Car, ExternalLink
} from "lucide-react";
import { retentionApi } from "@/lib/api";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@/lib/utils";
import type { YearWiseCohortRow, ModelWiseCohortRow, CohortVehicle } from "@/types";

const CHART_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

// ── Drill-down state ──────────────────────────────────────────────────────────
interface DrillTarget {
  serviceYear: number;
  saleYear?: number;
  modelName?: string;
  brandName?: string;
  visitBucket: string;
  label: string; // human-readable description for the panel header
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
function VisitCell({
  count, visitBucket, onClick,
}: {
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
    <button
      onClick={onClick}
      className={base + " cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current underline underline-offset-2"}
      title="Click to see these vehicles"
    >
      {count}
    </button>
  );
}

// ── Year selector ─────────────────────────────────────────────────────────────
function YearSelector({
  selectedYear, todayYear, onChange,
}: {
  selectedYear: number;
  todayYear: number;
  onChange: (y: number) => void;
}) {
  const years: number[] = [];
  for (let y = todayYear; y >= todayYear - 10; y--) years.push(y);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
        Measuring visits in:
      </span>
      {years.map(y => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className={
            "px-3 py-1 rounded-full text-xs font-semibold transition-all " +
            (y === selectedYear
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted text-muted-foreground hover:bg-muted/70")
          }
        >
          {y}
        </button>
      ))}
    </div>
  );
}

// ── Year-wise table ───────────────────────────────────────────────────────────
function YearWiseTable({
  rows, serviceYear, onDrill,
}: {
  rows: YearWiseCohortRow[];
  serviceYear: number;
  onDrill: (t: DrillTarget) => void;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-4">No data available.</p>;

  const totals = rows.reduce(
    (acc, r) => ({
      totalSold:   acc.totalSold   + r.totalSold,
      zeroVisits:  acc.zeroVisits  + r.zeroVisits,
      oneVisit:    acc.oneVisit    + r.oneVisit,
      twoVisits:   acc.twoVisits   + r.twoVisits,
      moreThanTwo: acc.moreThanTwo + r.moreThanTwo,
    }),
    { totalSold: 0, zeroVisits: 0, oneVisit: 0, twoVisits: 0, moreThanTwo: 0 }
  );
  const totalRetained = totals.totalSold - totals.zeroVisits;
  const overallRate   = totals.totalSold > 0 ? (totalRetained / totals.totalSold) * 100 : 0;

  const drill = (saleYear: number | undefined, visitBucket: DrillTarget["visitBucket"], label: string) =>
    onDrill({ serviceYear, saleYear, visitBucket, label });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
              Metric
            </th>
            {rows.map(r => (
              <th key={r.saleYear} className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
                {r.saleYear}
              </th>
            ))}
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Total Sold */}
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 font-medium text-xs text-muted-foreground whitespace-nowrap">Total Sold</td>
            {rows.map(r => (
              <td key={r.saleYear} className="py-2.5 px-3 text-center">
                <button
                  onClick={() => drill(r.saleYear, "visited", `All retained — sold ${r.saleYear}, visits in ${serviceYear}`)}
                  className="font-semibold text-foreground hover:text-primary hover:underline tabular-nums"
                  title="Click to see all vehicles sold this year"
                >
                  {r.totalSold}
                </button>
              </td>
            ))}
            <td className="py-2.5 px-3 text-center font-bold text-foreground">{totals.totalSold}</td>
          </tr>

          {/* 0 Visits */}
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 font-medium text-xs text-muted-foreground whitespace-nowrap">0 Visits in {serviceYear}</td>
            {rows.map(r => (
              <td key={r.saleYear} className="py-2.5 px-3 text-center">
                <VisitCell count={r.zeroVisits} visitBucket="zero"
                  onClick={() => drill(r.saleYear, "zero", `0 visits in ${serviceYear} — sold ${r.saleYear}`)} />
              </td>
            ))}
            <td className="py-2.5 px-3 text-center">
              <VisitCell count={totals.zeroVisits} visitBucket="zero"
                onClick={() => drill(undefined, "zero", `0 visits in ${serviceYear} — all years`)} />
            </td>
          </tr>

          {/* 1 Visit */}
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 font-medium text-xs text-muted-foreground whitespace-nowrap">1 Visit in {serviceYear}</td>
            {rows.map(r => (
              <td key={r.saleYear} className="py-2.5 px-3 text-center">
                <VisitCell count={r.oneVisit} visitBucket="one"
                  onClick={() => drill(r.saleYear, "one", `1 visit in ${serviceYear} — sold ${r.saleYear}`)} />
              </td>
            ))}
            <td className="py-2.5 px-3 text-center">
              <VisitCell count={totals.oneVisit} visitBucket="one"
                onClick={() => drill(undefined, "one", `1 visit in ${serviceYear} — all years`)} />
            </td>
          </tr>

          {/* 2 Visits */}
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 font-medium text-xs text-muted-foreground whitespace-nowrap">2 Visits in {serviceYear}</td>
            {rows.map(r => (
              <td key={r.saleYear} className="py-2.5 px-3 text-center">
                <VisitCell count={r.twoVisits} visitBucket="two"
                  onClick={() => drill(r.saleYear, "two", `2 visits in ${serviceYear} — sold ${r.saleYear}`)} />
              </td>
            ))}
            <td className="py-2.5 px-3 text-center">
              <VisitCell count={totals.twoVisits} visitBucket="two"
                onClick={() => drill(undefined, "two", `2 visits in ${serviceYear} — all years`)} />
            </td>
          </tr>

          {/* 2+ Visits */}
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 font-medium text-xs text-muted-foreground whitespace-nowrap">2+ Visits in {serviceYear}</td>
            {rows.map(r => (
              <td key={r.saleYear} className="py-2.5 px-3 text-center">
                <VisitCell count={r.moreThanTwo} visitBucket="moreThanTwo"
                  onClick={() => drill(r.saleYear, "moreThanTwo", `2+ visits in ${serviceYear} — sold ${r.saleYear}`)} />
              </td>
            ))}
            <td className="py-2.5 px-3 text-center">
              <VisitCell count={totals.moreThanTwo} visitBucket="moreThanTwo"
                onClick={() => drill(undefined, "moreThanTwo", `2+ visits in ${serviceYear} — all years`)} />
            </td>
          </tr>

          {/* Retention % */}
          <tr className="bg-muted/20">
            <td className="py-2.5 pr-4 font-semibold text-xs text-foreground whitespace-nowrap">Retention %</td>
            {rows.map(r => (
              <td key={r.saleYear} className="py-2.5 px-3 text-center">
                <RateBadge rate={r.retentionRate} />
              </td>
            ))}
            <td className="py-2.5 px-3 text-center"><RateBadge rate={overallRate} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Model-wise table ──────────────────────────────────────────────────────────
function ModelWiseTable({
  rows, serviceYear, onDrill,
}: {
  rows: ModelWiseCohortRow[];
  serviceYear: number;
  onDrill: (t: DrillTarget) => void;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-4">No data available.</p>;

  const drill = (r: ModelWiseCohortRow, visitBucket: DrillTarget["visitBucket"], label: string) =>
    onDrill({ serviceYear, modelName: r.modelName, brandName: r.brandName, visitBucket, label });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Model</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Total Sold</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">0 Visits</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">1 Visit</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">2 Visits</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">2+ Visits</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Retention %</th>
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
                <button
                  onClick={() => drill(r, "visited", `All retained — ${r.brandName} ${r.modelName}, visits in ${serviceYear}`)}
                  className="font-semibold text-foreground hover:text-primary hover:underline tabular-nums"
                >
                  {r.totalSold}
                </button>
              </td>
              <td className="py-2.5 px-3 text-center">
                <VisitCell count={r.zeroVisits} visitBucket="zero"
                  onClick={() => drill(r, "zero", `0 visits in ${serviceYear} — ${r.brandName} ${r.modelName}`)} />
              </td>
              <td className="py-2.5 px-3 text-center">
                <VisitCell count={r.oneVisit} visitBucket="one"
                  onClick={() => drill(r, "one", `1 visit in ${serviceYear} — ${r.brandName} ${r.modelName}`)} />
              </td>
              <td className="py-2.5 px-3 text-center">
                <VisitCell count={r.twoVisits} visitBucket="two"
                  onClick={() => drill(r, "two", `2 visits in ${serviceYear} — ${r.brandName} ${r.modelName}`)} />
              </td>
              <td className="py-2.5 px-3 text-center">
                <VisitCell count={r.moreThanTwo} visitBucket="moreThanTwo"
                  onClick={() => drill(r, "moreThanTwo", `2+ visits in ${serviceYear} — ${r.brandName} ${r.modelName}`)} />
              </td>
              <td className="py-2.5 px-3 text-center"><RateBadge rate={r.retentionRate} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {(() => {
            const tot = rows.reduce(
              (a, r) => ({
                totalSold:   a.totalSold   + r.totalSold,
                zeroVisits:  a.zeroVisits  + r.zeroVisits,
                oneVisit:    a.oneVisit    + r.oneVisit,
                twoVisits:   a.twoVisits   + r.twoVisits,
                moreThanTwo: a.moreThanTwo + r.moreThanTwo,
              }),
              { totalSold: 0, zeroVisits: 0, oneVisit: 0, twoVisits: 0, moreThanTwo: 0 }
            );
            const rate = tot.totalSold > 0 ? ((tot.totalSold - tot.zeroVisits) / tot.totalSold) * 100 : 0;
            return (
              <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                <td className="py-2.5 pr-4 text-xs uppercase tracking-wide text-foreground">Total</td>
                <td className="py-2.5 px-3 text-center font-bold text-foreground">{tot.totalSold}</td>
                <td className="py-2.5 px-3 text-center"><VisitCell count={tot.zeroVisits}  visitBucket="zero"        onClick={() => onDrill({ serviceYear, visitBucket: "zero",        label: `0 visits in ${serviceYear} — all models` })} /></td>
                <td className="py-2.5 px-3 text-center"><VisitCell count={tot.oneVisit}    visitBucket="one"         onClick={() => onDrill({ serviceYear, visitBucket: "one",         label: `1 visit in ${serviceYear} — all models` })} /></td>
                <td className="py-2.5 px-3 text-center"><VisitCell count={tot.twoVisits}   visitBucket="two"         onClick={() => onDrill({ serviceYear, visitBucket: "two",         label: `2 visits in ${serviceYear} — all models` })} /></td>
                <td className="py-2.5 px-3 text-center"><VisitCell count={tot.moreThanTwo} visitBucket="moreThanTwo" onClick={() => onDrill({ serviceYear, visitBucket: "moreThanTwo", label: `2+ visits in ${serviceYear} — all models` })} /></td>
                <td className="py-2.5 px-3 text-center"><RateBadge rate={rate} /></td>
              </tr>
            );
          })()}
        </tfoot>
      </table>
    </div>
  );
}

// ── Drill-down slide panel ────────────────────────────────────────────────────
function DrillPanel({
  target, onClose,
}: {
  target: DrillTarget;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["cohort-vehicles", target],
    queryFn: () => retentionApi.getCohortVehicles({
      serviceYear: target.serviceYear,
      saleYear:    target.saleYear,
      modelName:   target.modelName,
      brandName:   target.brandName,
      visitBucket: target.visitBucket,
    }),
  });

  const vehicles = data ?? [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col h-full"
        >
          {/* Header */}
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

          {/* Body */}
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
  const visitColor =
    v.visitsInYear === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary font-semibold">{v.vin}</span>
          {v.plateNumber && (
            <span className="font-mono text-xs font-bold text-foreground">{v.plateNumber}</span>
          )}
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
        <Link
          href={`/vehicles/${v.id}`}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          360° View <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RetentionPage() {
  const currentCalendarYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentCalendarYear);
  const [drillTarget, setDrillTarget]   = useState<DrillTarget | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["retention-analytics"],
    queryFn: () => retentionApi.getAnalytics({ trendMonths: 12 }),
    refetchInterval: 10 * 60_000,
  });

  const { data: cohortData, isLoading: cohortLoading } = useQuery({
    queryKey: ["retention-visit-cohorts", selectedYear],
    queryFn: () => retentionApi.getVisitCohorts(selectedYear),
    refetchInterval: 10 * 60_000,
  });

  const todayYear = cohortData?.todayYear ?? currentCalendarYear;

  if (isLoading) return <RetentionSkeleton />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold">Retention Analytics</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Dynamic retention engine — powered by configurable service policies
        </p>
      </motion.div>

      {/* Period KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "6-Month Retention",   data: data.monthly,   color: "#6366f1", period: "Rolling 6 months" },
          { label: "12-Month Retention",  data: data.yearly,    color: "#10b981", period: "This year" },
          { label: "Quarterly Retention", data: data.quarterly, color: "#0ea5e9", period: "This quarter" },
        ].map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-[80px]" style={{ background: p.color }} />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.label}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{p.period}</p>
            <p className="text-4xl font-black mt-2" style={{ color: p.color }}>
              {formatPercentage(p.data.retentionRate, 1)}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-xs">
              <div className="text-muted-foreground">Eligible</div>  <div className="font-semibold text-foreground text-right">{p.data.eligibleVehicles}</div>
              <div className="text-muted-foreground">Returned</div>  <div className="font-semibold text-emerald-600 text-right">{p.data.returnedVehicles}</div>
              <div className="text-muted-foreground">Lost</div>      <div className="font-semibold text-red-500 text-right">{p.data.lostVehicles}</div>
              <div className="text-muted-foreground">Due Soon</div>  <div className="font-semibold text-amber-500 text-right">{p.data.dueSoonVehicles}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Lost Vehicles"  value={data.monthly.lostVehicles}      icon={AlertTriangle} variant="danger"  index={0} href="/vehicles?status=Lost"      />
        <KpiCard title="Overdue"        value={data.monthly.overdueVehicles}    icon={TrendingDown}  variant="warning" index={1} href="/vehicles?status=Overdue"   />
        <KpiCard title="Recovered"      value={data.monthly.recoveredVehicles}  icon={RefreshCw}     variant="success" index={2} href="/vehicles?status=Recovered"  />
        <KpiCard title="Due Soon"       value={data.monthly.dueSoonVehicles}    icon={TrendingUp}    variant="info"    index={3} href="/vehicles?status=DueSoon"   />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">12-Month Retention Trend</CardTitle>
            <CardDescription>Monthly retention rate vs. eligible vehicles</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Brand Retention YTD</CardTitle>
            <CardDescription>Year-to-date retention rate by brand</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.byBrand} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="brandName" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Retention Rate"]}
                />
                <Bar dataKey="retentionRate" radius={[0, 4, 4, 0]}>
                  {data.byBrand.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Cohort tables with year selector ─────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
            <div>
              <CardTitle className="text-base">Age-wise Retention — By Sale Year</CardTitle>
              <CardDescription className="mt-0.5">
                How many vehicles sold each year came in for service during <strong>{selectedYear}</strong>.
                Click any number to see the exact vehicles.
              </CardDescription>
            </div>
            {/* Compare badge */}
            {selectedYear !== todayYear && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                Comparing {selectedYear} vs current ({todayYear})
              </span>
            )}
          </div>

          <div className="mt-3">
            <YearSelector selectedYear={selectedYear} todayYear={todayYear} onChange={y => setSelectedYear(y)} />
          </div>
        </CardHeader>
        <CardContent>
          {cohortLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : cohortData ? (
            <YearWiseTable rows={cohortData.yearWise} serviceYear={selectedYear} onDrill={setDrillTarget} />
          ) : null}
        </CardContent>
      </Card>

      {/* Model-wise table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Model-wise Retention</CardTitle>
          <CardDescription>
            Visit frequency in <strong>{selectedYear}</strong> grouped by vehicle model.
            Click any number to see the exact vehicles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cohortLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : cohortData ? (
            <ModelWiseTable rows={cohortData.modelWise} serviceYear={selectedYear} onDrill={setDrillTarget} />
          ) : null}
        </CardContent>
      </Card>

      {/* Cohort Analysis */}
      {data.cohorts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cohort Retention Analysis</CardTitle>
            <CardDescription>
              How vehicles sold in each quarter returned for service at 3, 6, 12, and 24 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-6 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Cohort</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Vehicles</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">3 Months</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">6 Months</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">12 Months</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">24 Months</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-6 font-medium">{c.cohortLabel}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{c.totalVehicles}</td>
                      {[c.month3Rate, c.month6Rate, c.month12Rate, c.month24Rate].map((rate, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right">
                          <span className={`font-semibold ${rate >= 70 ? "text-emerald-600 dark:text-emerald-400" : rate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {formatPercentage(rate, 1)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drill-down panel */}
      {drillTarget && (
        <DrillPanel target={drillTarget} onClose={() => setDrillTarget(null)} />
      )}
    </div>
  );
}

function RetentionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      <div className="grid grid-cols-2 gap-4">{[0, 1].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
