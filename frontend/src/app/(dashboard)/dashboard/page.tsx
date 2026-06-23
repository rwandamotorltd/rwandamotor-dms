"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Car, Users, TrendingUp, AlertTriangle,
  Clock, RefreshCw, Activity, Wrench, ClipboardList, FileCheck
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const STATUS_COLORS = {
  Active:    "#10b981",
  DueSoon:   "#f59e0b",
  Overdue:   "#f97316",
  Lost:      "#ef4444",
  Recovered: "#3b82f6",
};

const CHART_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [greeting, setGreeting] = useState("");

  useEffect(() => { setGreeting(getGreeting()); }, []);

  const showKpi         = hasPermission("dashboard.kpi");
  const showRetention   = hasPermission("dashboard.retention");
  const showJobCards    = hasPermission("dashboard.jobCardsWidget");
  const showFollowUps   = hasPermission("followUps.view") || hasPermission("followUps.manage");
  const showAppts       = hasPermission("appointments.view") || hasPermission("appointments.manage");

  const needsKpiData = showKpi || showRetention || showJobCards;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: dashboardApi.getKpis,
    enabled: needsKpiData,
    refetchInterval: 5 * 60_000,
  });

  const kpis = data;
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  const retentionTrend    = kpis?.retentionTrend  ?? [];
  const brandRetention    = kpis?.brandRetention  ?? [];

  const statusDistribution = kpis ? [
    { name: "Active",    value: kpis.activeVehicles,    color: STATUS_COLORS.Active },
    { name: "Due Soon",  value: kpis.dueSoonVehicles,   color: STATUS_COLORS.DueSoon },
    { name: "Overdue",   value: kpis.overdueVehicles,   color: STATUS_COLORS.Overdue },
    { name: "Lost",      value: kpis.lostVehicles,      color: STATUS_COLORS.Lost },
    { name: "Recovered", value: kpis.recoveredVehicles, color: STATUS_COLORS.Recovered },
  ] : [];

  if (isLoading && needsKpiData) return (
    <DashboardSkeleton showKpi={showKpi} showRetention={showRetention} showJobCards={showJobCards} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {greeting}{firstName ? `, ${firstName}` : ""} 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Here&apos;s your overview for today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Live data
            </div>
          </div>
        </div>
      </motion.div>

      {/* ──────────────────────── RETENTION SECTION ──────────────────────── */}
      {showRetention && kpis && (
        <>
          <SectionDivider title="Retention" />

          {/* Retention Rate Heroes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "6-Month Retention",   value: kpis.sixMonthRetentionRate,   period: "Rolling 6 months" },
              { label: "12-Month Retention",  value: kpis.yearlyRetentionRate,     period: "This year" },
              { label: "Quarterly Retention", value: kpis.quarterlyRetentionRate,  period: "This quarter" },
            ].map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="absolute inset-0 gradient-primary opacity-5" />
                <p className="text-sm font-medium text-muted-foreground">{r.label}</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {formatPercentage(r.value)}
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">%</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-primary rounded-full" style={{ width: `${Math.min(r.value, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{r.period}</p>
              </motion.div>
            ))}
          </div>

          {/* Fleet status breakdown (companion to retention) */}
          {showKpi && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard title="Total Vehicles"    value={kpis.totalVehicles}                          subtitle="All registered"   icon={Car}       variant="info"    index={0}  href="/vehicles" />
              <KpiCard title="Dealership Fleet"  value={kpis.dealershipVehicles}                     subtitle="Sold by us"       icon={Car}       variant="purple"  index={1}  href="/vehicles?isSoldByDealership=true" />
              <KpiCard title="Customers"         value={kpis.totalCustomers}                          subtitle="Total registered" icon={Users}     variant="default" index={2}  href="/customers" />
              <KpiCard title="Monthly Services"  value={kpis.monthlyServiceCount}                     subtitle="This month"       icon={Wrench}    variant="default" index={3}  href="/service-records" />
              <KpiCard title="6-Month Rate"      value={formatPercentage(kpis.sixMonthRetentionRate)} subtitle="Rolling 6 months" icon={TrendingUp} variant="success" index={4}  href="/retention" />
            </div>
          )}
        </>
      )}

      {/* Fleet cards when kpi allowed but retention widget not permitted */}
      {showKpi && kpis && !showRetention && (
        <>
          <SectionDivider title="Fleet Status" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Vehicles"    value={kpis.totalVehicles}       subtitle="All registered"   icon={Car}    variant="info"    index={0}  href="/vehicles" />
            <KpiCard title="Dealership Fleet"  value={kpis.dealershipVehicles}  subtitle="Sold by us"       icon={Car}    variant="purple"  index={1}  href="/vehicles?isSoldByDealership=true" />
            <KpiCard title="Customers"         value={kpis.totalCustomers}       subtitle="Total registered" icon={Users}  variant="default" index={2}  href="/customers" />
            <KpiCard title="Monthly Services"  value={kpis.monthlyServiceCount}  subtitle="This month"       icon={Wrench} variant="default" index={3}  href="/service-records" />
          </div>
        </>
      )}

      {/* ──────────────────────── FOLLOW-UPS SECTION ──────────────────────── */}
      {showKpi && kpis && (
        <>
          <SectionDivider title="Follow-ups" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard title="Active Follow-ups" value={kpis.activeFollowUps}      subtitle="Pending contact"     icon={Activity}      variant="info"    index={0} href="/follow-ups" />
            <KpiCard title="Due Soon"          value={kpis.dueSoonVehicles}      subtitle="Needs outreach"      icon={Clock}         variant="warning" index={1} href="/retention" />
            <KpiCard title="Overdue"           value={kpis.overdueVehicles}      subtitle="Missed interval"     icon={AlertTriangle} variant="warning" index={2} href="/retention" />
            <KpiCard title="Lost"              value={kpis.lostVehicles}         subtitle="12m no service"      icon={AlertTriangle} variant="danger"  index={3} href="/retention" />
            <KpiCard title="Recovered"         value={kpis.recoveredVehicles}    subtitle="Returned for service" icon={RefreshCw}    variant="success" index={4} href="/follow-ups" />
          </div>
        </>
      )}

      {/* ──────────────────────── WORKSHOP SECTION ──────────────────────── */}
      {showJobCards && kpis && (
        <>
          <SectionDivider title="Workshop" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <KpiCard title="Open Job Cards"      value={kpis.openJobCards ?? 0}    subtitle="Awaiting delivery"       icon={ClipboardList} variant="warning" index={0} href="/job-cards?status=Open" />
            <KpiCard title="Today's Receptions"  value={kpis.todayJobCards ?? 0}   subtitle="Vehicles received today" icon={FileCheck}     variant="info"    index={1} href="/job-cards" />
            <KpiCard title="Monthly Job Cards"   value={kpis.monthlyJobCards ?? 0} subtitle="This month"              icon={ClipboardList} variant="default" index={2} href="/job-cards" />
          </div>
        </>
      )}

      {/* ──────────────────────── CHARTS ──────────────────────── */}
      {showRetention && kpis && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Retention Trend */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Retention Trend</CardTitle>
                <CardDescription>Monthly retention rate — last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={retentionTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any, name: any) => [
                        name === "retentionRate" ? `${Number(v).toFixed(1)}%` : v,
                        name === "retentionRate" ? "Retention Rate" : String(name),
                      ]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    />
                    <Area type="monotone" dataKey="retentionRate" stroke="#6366f1" strokeWidth={2.5}
                      fill="url(#retentionGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Fleet Status Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Fleet Status</CardTitle>
                <CardDescription>Current retention distribution</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {statusDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full mt-2">
                  {statusDistribution.map(s => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="ml-auto font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Brand Retention */}
          {brandRetention.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Brand Retention Performance</CardTitle>
                <CardDescription>Year-to-date retention rate by brand</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={brandRetention} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="brandName" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Retention Rate"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    />
                    <Bar dataKey="retentionRate" radius={[4, 4, 0, 0]}>
                      {brandRetention.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ──────────────────────── FOLLOW-UPS / APPOINTMENTS QUICK LINKS ──────────────────────── */}
      {(showFollowUps || showAppts) && !showRetention && (
        <>
          <SectionDivider title="My Work" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showFollowUps && kpis && (
              <KpiCard
                title="Active Follow-ups"
                value={kpis.activeFollowUps}
                subtitle="Pending customer contact"
                icon={Activity}
                variant="warning"
                index={0}
                href="/follow-ups"
              />
            )}
            {showAppts && kpis && (
              <KpiCard
                title="Overdue Vehicles"
                value={kpis.overdueVehicles}
                subtitle="Need scheduling"
                icon={AlertTriangle}
                variant="danger"
                index={1}
                href="/appointments"
              />
            )}
          </div>
        </>
      )}

      {/* Empty state for very restricted users */}
      {!showKpi && !showRetention && !showJobCards && !showFollowUps && !showAppts && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No dashboard widgets are enabled for your account. Contact your administrator.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton({ showKpi, showRetention, showJobCards }: {
  showKpi: boolean; showRetention: boolean; showJobCards: boolean;
}) {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-64" />
      {showRetention && (
        <>
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          {showKpi && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{[...Array(9)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
        </>
      )}
      {showKpi && !showRetention && (
        <>
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        </>
      )}
      {showKpi && (
        <>
          <Skeleton className="h-4 w-28" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Skeleton className="h-24 rounded-xl" /></div>
        </>
      )}
      {showJobCards && (
        <>
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        </>
      )}
      {showRetention && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><Skeleton className="h-72 lg:col-span-2 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>}
    </div>
  );
}
