"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ShoppingCart, Search, ChevronLeft, ChevronRight, Filter,
  Car, User, FileText
} from "lucide-react";
import { salesApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesHistoryItem } from "@/types";

const SALE_TYPE_COLORS: Record<string, string> = {
  PDI:    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  Direct: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
};

function SaleTypeBadge({ type }: { type: string }) {
  const cls = SALE_TYPE_COLORS[type] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
      {type}
    </span>
  );
}

function SaleRow({ item }: { item: SalesHistoryItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-sm"
    >
      {/* Vehicle + customer */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">
            {item.year} {item.brandName} {item.modelName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-muted-foreground text-xs">
          <span className="font-mono">{item.plateNumber ?? item.vin}</span>
          {item.plateNumber && <span className="opacity-50">·</span>}
          {item.plateNumber && <span className="font-mono opacity-60">{item.vin}</span>}
        </div>
      </div>

      {/* Customer */}
      <div className="min-w-0">
        {item.customerName ? (
          <>
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{item.customerName}</span>
            </div>
            {item.customerPhone && (
              <p className="text-xs text-muted-foreground mt-0.5 pl-5">{item.customerPhone}</p>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* References + date */}
      <div className="text-right shrink-0">
        {item.deliveryNoteNumber && (
          <div className="flex items-center gap-1.5 justify-end text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <a
              href={item.jobCardId ? `/job-cards/${item.jobCardId}` : "#"}
              className="font-mono hover:underline hover:text-primary"
            >
              {item.deliveryNoteNumber}
            </a>
          </div>
        )}
        {item.jobCardNumber && (
          <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">{item.jobCardNumber}</p>
        )}
      </div>

      {/* Sale type + date */}
      <div className="text-right shrink-0 space-y-1">
        <SaleTypeBadge type={item.saleType} />
        <p className="text-xs text-muted-foreground">{format(new Date(item.saleDate), "dd MMM yyyy")}</p>
      </div>
    </motion.div>
  );
}

export default function SalesPage() {
  const [search, setSearch]       = useState("");
  const [saleType, setSaleType]   = useState("all");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [page, setPage]           = useState(1);

  const params = useMemo(() => ({
    search:    search || undefined,
    saleType:  saleType !== "all" ? saleType : undefined,
    dateFrom:  dateFrom || undefined,
    dateTo:    dateTo   || undefined,
    pageNumber: page,
    pageSize:  50,
  }), [search, saleType, dateFrom, dateTo, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["sales", params],
    queryFn:  () => salesApi.list(params),
  });

  const hasFilters = search || saleType !== "all" || dateFrom || dateTo;

  function resetFilters() {
    setSearch(""); setSaleType("all"); setDateFrom(""); setDateTo(""); setPage(1);
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sales Records</h1>
            <p className="text-sm text-muted-foreground">
              Vehicle sales history — auto-created from PDI delivery notes
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap gap-3 items-center"
      >
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, plate, customer, delivery note…"
            className="pl-9"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <Select value={saleType} onValueChange={v => { setSaleType(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sale type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="PDI">PDI</SelectItem>
            <SelectItem value="Direct">Direct</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date" className="w-36 text-sm"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date" className="w-36 text-sm"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicle</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Reference</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Type / Date</span>
        </div>

        {/* Count */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/10">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <>
                <span className="font-medium text-foreground">{data?.totalCount ?? 0}</span> sales records
                {data && data.totalPages > 1 && (
                  <> · page <span className="font-medium text-foreground">{page}</span> of {data.totalPages}</>
                )}
              </>
            )}
          </p>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3">
                <div className="space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div>
                <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                <Skeleton className="h-4 w-24 self-center" />
                <Skeleton className="h-5 w-16 self-center" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 opacity-20" />
            <p className="text-sm">No sales records found</p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map(item => <SaleRow key={item.id} item={item} />)}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
