"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, User, Car, Wrench, Calendar, Phone, Mail, MapPin,
  Building2, DollarSign, Hash, CheckCircle2, FileText, Gauge
} from "lucide-react";
import { customersApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { RetentionBadge } from "@/components/shared/retention-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { cn, formatDate, formatCurrency, formatMileage, SERVICE_TYPE_LABELS, CUSTOMER_CATEGORY_LABELS } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORY_COLORS: Record<string, string> = {
  Retail:     "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  Corporate:  "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
  Government: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  NGO:        "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
  Fleet:      "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400",
  VIP:        "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
  External:   "bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400",
};

export default function Customer360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  void user;

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer-360", id],
    queryFn: () => customersApi.get360(id),
  });

  if (isLoading) return <Customer360Skeleton />;
  if (!customer) return <div className="text-center py-20 text-muted-foreground">Customer not found.</div>;

  const initials = customer.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const totalRevenue = customer.serviceHistory.reduce((sum, s) => sum + (s.totalCost ?? 0), 0);
  const memberSince = new Date(customer.createdAt);
  const memberYears = Math.floor((Date.now() - memberSince.getTime()) / (365.25 * 24 * 3600 * 1000));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Link href="/customers" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-muted-foreground")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Customers
        </Link>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-lg">
            <User className="w-9 h-9 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{customer.fullName}</h1>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", CATEGORY_COLORS[customer.category] ?? "bg-muted text-muted-foreground")}>
                {CUSTOMER_CATEGORY_LABELS[customer.category] ?? customer.category}
              </span>
              <Badge variant={customer.isActive ? "secondary" : "outline"} className="text-xs">
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
              {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
              {customer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
              {customer.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{customer.city}</span>}
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Vehicles" value={customer.vehicles.length} icon={Car} variant="info" index={0} />
        <KpiCard title="Job Cards" value={customer.jobCards?.length ?? 0} icon={FileText} variant="default" index={1} />
        <KpiCard title="Total Spent" value={formatCurrency(totalRevenue)} icon={DollarSign} variant="success" index={2} />
        <KpiCard
          title="Member Since"
          value={memberYears > 0 ? memberYears + (memberYears === 1 ? " year" : " years") : "< 1 year"}
          icon={Calendar}
          variant="purple"
          index={3}
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" /> Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <DetailRow label="Full Name" value={customer.fullName} />
              <DetailRow label="Category" value={CUSTOMER_CATEGORY_LABELS[customer.category] ?? customer.category} />
              <DetailRow label="Contact Method" value={customer.preferredContactMethod} />
              <Separator />
              <DetailRow label="Phone" value={customer.phone} />
              <DetailRow label="Email" value={customer.email} />
              <DetailRow label="City" value={customer.city} />
              <DetailRow label="Country" value={customer.country} />
              <DetailRow label="Address" value={customer.address} />
              {customer.companyName && (
                <>
                  <Separator />
                  <DetailRow label="Company" value={customer.companyName} />
                  <DetailRow label="Tax ID" value={customer.taxId} />
                </>
              )}
              <Separator />
              <DetailRow label="Member Since" value={formatDate(customer.createdAt)} />
            </CardContent>
          </Card>

          {/* Vehicles Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" /> Vehicles ({customer.vehicles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No vehicles registered</p>
              ) : customer.vehicles.map((v, idx) => (
                <motion.div key={v.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Link
                    href={"/vehicles/" + v.id}
                    className="block rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm text-foreground">{v.brandName} {v.modelName} · {v.year}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">{v.vin}</p>
                        {v.plateNumber && <p className="font-semibold text-xs text-primary mt-0.5">{v.plateNumber}</p>}
                      </div>
                      <RetentionBadge status={v.retentionStatus} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {v.currentMileage != null && (
                        <span>{formatMileage(v.currentMileage)}</span>
                      )}
                      {v.lastServiceDate && (
                        <span>Last service: {formatDate(v.lastServiceDate)}</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="jobcards">
            <TabsList className="mb-4">
              <TabsTrigger value="jobcards">Job Cards ({customer.jobCards?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="history">Service Records ({customer.serviceHistory.length})</TabsTrigger>
            </TabsList>

            {/* Job Cards Tab */}
            <TabsContent value="jobcards" className="space-y-3">
              {(customer.jobCards?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 opacity-25" />
                  <p className="text-sm">No job cards yet</p>
                </div>
              ) : (
                (customer.jobCards ?? []).map((jc, idx) => (
                  <motion.div key={jc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                    <Link href={"/job-cards/" + jc.id}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${jc.status === "Open" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                                <FileText className={`w-4 h-4 ${jc.status === "Open" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-semibold text-sm text-primary">{jc.jobCardNumber}</span>
                                  <Badge variant={jc.status === "Open" ? "outline" : "secondary"} className={`text-[10px] py-0 px-1.5 h-4 ${jc.status === "Open" ? "border-amber-400 text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                                    {jc.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                    {SERVICE_TYPE_LABELS[jc.serviceType] ?? jc.serviceType}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {formatDate(jc.createdAt)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Gauge className="w-3 h-3" /> {formatMileage(jc.mileage)}
                                  </span>
                                  {jc.vin && <span className="font-mono">{jc.vin}</span>}
                                  {jc.plateNumber && <span className="font-semibold text-primary">{jc.plateNumber}</span>}
                                  {jc.technicianName && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" /> {jc.technicianName}
                                    </span>
                                  )}
                                </div>
                                {jc.deliveryNoteNumber && (
                                  <p className="text-xs font-mono text-muted-foreground mt-0.5">DN: {jc.deliveryNoteNumber}</p>
                                )}
                                {jc.notes && (
                                  <p className="text-xs text-foreground/70 mt-1">{jc.notes}</p>
                                )}
                              </div>
                            </div>
                            {jc.closedAt && (
                              <div className="text-right text-xs text-muted-foreground shrink-0">
                                <p>Closed</p>
                                <p className="font-medium">{formatDate(jc.closedAt)}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))
              )}
            </TabsContent>

            {/* Service Records Tab */}
            <TabsContent value="history">
              <Card>
                <CardContent className="p-0">
                  {customer.serviceHistory.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                      <Wrench className="w-12 h-12 opacity-25" />
                      <p className="text-sm">No service records yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technician</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customer.serviceHistory.map((s, idx) => (
                            <motion.tr
                              key={s.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.02 }}
                              className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <p className="font-medium text-sm">{formatDate(s.serviceDate)}</p>
                                <p className="text-xs text-muted-foreground">{formatMileage(s.mileageAtService)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-sm">{s.vehicleLabel}</p>
                                {s.plateNumber && <p className="text-xs font-semibold text-primary">{s.plateNumber}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={s.isWarrantyJob ? "outline" : "secondary"} className="text-xs">
                                    {SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}
                                  </Badge>
                                  {s.isWarrantyJob && (
                                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Warranty</span>
                                  )}
                                </div>
                                {s.invoiceNumber && (
                                  <p className="font-mono text-xs text-muted-foreground mt-1">{s.invoiceNumber}</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {s.technicianName ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarFallback className="text-[10px] gradient-primary text-white">
                                        {s.technicianName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{s.technicianName}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-medium text-sm">{formatCurrency(s.totalCost)}</span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium truncate text-right text-foreground">{value ?? "—"}</span>
    </div>
  );
}

function Customer360Skeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="col-span-2 h-[500px] rounded-xl" />
      </div>
    </div>
  );
}
