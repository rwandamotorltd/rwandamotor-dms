"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Car, Users, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, Activity, Wrench, BarChart3, ClipboardList, FileCheck
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@/lib/utils";

const STATUS_COLORS = {
  Active: "#10b981",
  DueSoon: "#f59e0b",
  Overdue: "#f97316",
  Lost: "#ef4444",
  Recovered: "#3b82f6",
};

const CHART_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: dashboardApi.getKpis,
    refetchInterval: 5 * 60_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  const kpis = data;
  if (!kpis) return null;

  const statusDistribution = [
    { name: "Active",    value: kpis.activeVehicles,    color: STATUS_COLORS.Active },
    { name: "Due Soon",  value: kpis.dueSoonVehicles,   color: STATUS_COLORS.DueSoon },
    { name: "Overdue",   value: kpis.overdueVehicles,   color: STATUS_COLORS.Overdue },
    { name: "Lost",      value: kpis.lostVehicles,      color: STATUS_COLORS.Lost },
    { name: "Recovered", value: kpis.recoveredVehicles, color: STATUS_COLORS.Recovered },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Good morning 👋</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Here&apos;s what&apos;s happening with your fleet today.
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

      {/* Retention Rate Heroes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "6-Month Retention",  value: kpis.sixMonthRetentionRate,  period: "Rolling 6 months" },
          { label: "12-Month Retention", value: kpis.yearlyRetentionRate,     period: "This year" },
          { label: "Quarterly Retention", value: kpis.quarterlyRetentionRate, period: "This quarter" },
        ].map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-xl border border-border p-5 bg-card shadow-sm"
          >
            <div className="absolute inset-0 gradient-primary opacity-5" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{r.label}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">{formatPercentage(r.value, 1)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{r.period}</p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.value >= 70 ? STATUS_COLORS.Active : r.value >= 50 ? STATUS_COLORS.DueSoon : STATUS_COLORS.Lost }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(r.value, 100)}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 + 0.3 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard title="Total Vehicles"   value={kpis.totalVehicles}        subtitle="All registered"      icon={Car}           variant="info"    index={0} href="/vehicles" />
        <KpiCard title="Dealership Fleet" value={kpis.dealershipVehicles}   subtitle="Sold by us"          icon={Car}           variant="purple"  index={1} href="/vehicles?isSoldByDealership=true" />
        <KpiCard title="Customers"        value={kpis.totalCustomers}        subtitle="Total registered"    icon={Users}         variant="default" index={2} href="/customers" />
        <KpiCard title="Due Soon"         value={kpis.dueSoonVehicles}       subtitle="Upcoming service"    icon={Clock}         variant="warning" index={3} href="/vehicles?status=DueSoon" />
        <KpiCard title="Lost Vehicles"    value={kpis.lostVehicles}          subtitle="> 12 months overdue" icon={AlertTriangle} variant="danger"  index={4} href="/vehicles?status=Lost" />
        <KpiCard title="Overdue"          value={kpis.overdueVehicles}       subtitle="Missed interval"     icon={AlertTriangle} variant="warning" index={5} href="/vehicles?status=Overdue" />
        <KpiCard title="Recovered"        value={kpis.recoveredVehicles}     subtitle="Returned after lost" icon={RefreshCw}     variant="success" index={6} href="/vehicles?status=Recovered" />
        <KpiCard title="Follow-ups"       value={kpis.activeFollowUps}       subtitle="Pending contact"     icon={Activity}      variant="info"    index={7} href="/retention" />
        <KpiCard title="Monthly Services"  value={kpis.monthlyServiceCount}                      subtitle="This month"      icon={Wrench}         variant="default" index={8} href="/service-records" />
        <KpiCard title="6-Month Retention" value={formatPercentage(kpis.sixMonthRetentionRate)} subtitle="Rolling 6 months" icon={TrendingUp}      variant="success" index={9} href="/retention" />
        <KpiCard title="Open Job Cards"    value={kpis.openJobCards ?? 0}                        subtitle="Awaiting delivery" icon={ClipboardList}  variant="warning" index={10} href="/job-cards?status=Open" />
        <KpiCard title="Today's Receptions" value={kpis.todayJobCards ?? 0}                     subtitle="Vehicles received today" icon={FileCheck} variant="info"    index={11} href="/job-cards" />
        <KpiCard title="Monthly Job Cards" value={kpis.monthlyJobCards ?? 0}                    subtitle="This month"       icon={ClipboardList}  variant="default" index={12} href="/job-cards" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Retention Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Retention Trend</CardTitle>
            <CardDescription>Monthly retention rate — last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={kpis.retentionTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
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
                    name === "retentionRate" ? "Retention Rate" : String(name)
                  ]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Area type="monotone" dataKey="retentionRate" stroke="#6366f1" strokeWidth={2.5} fill="url(#retentionGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
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
      {kpis.brandRetention.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Brand Retention Performance</CardTitle>
            <CardDescription>Year-to-date retention rate by brand</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kpis.brandRetention} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="brandName" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Retention Rate"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Bar dataKey="retentionRate" radius={[4, 4, 0, 0]}>
                  {kpis.brandRetention.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[0,1,2,3,4,5,6,7,8,9].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-80 col-span-2 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
