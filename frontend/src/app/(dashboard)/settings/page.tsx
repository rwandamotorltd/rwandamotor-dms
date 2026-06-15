"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { jobCardsApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, Hash, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [startingSequence, setStartingSequence] = useState(1);

  const sequenceMutation = useMutation({
    mutationFn: () => jobCardsApi.updateSequence(year, startingSequence),
    onSuccess: () =>
      toast.success(`Sequence for ${year} set — first card will be OR${String(year).slice(-2)}${String(startingSequence).padStart(5, "0")}`),
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? "Failed to update sequence"),
  });

  const isAdmin = user?.role === "Admin";

  const previewNumber = `OR${String(year).slice(-2)}${String(startingSequence).padStart(5, "0")}`;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">System configuration and preferences</p>
      </div>

      <Separator />

      {!isAdmin ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No configurable settings available for your role.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="w-4 h-4" /> Job Card Sequence Override
            </CardTitle>
            <CardDescription>
              Set the starting number for job card IDs in a given year. Only applies if no
              cards have been issued yet for that year (i.e. the sequence hasn&apos;t started).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="seq-year">Year</Label>
                <Input
                  id="seq-year"
                  type="number"
                  min={2020}
                  max={2099}
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seq-start">Starting Number</Label>
                <Input
                  id="seq-start"
                  type="number"
                  min={1}
                  value={startingSequence}
                  onChange={e => setStartingSequence(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="rounded-md bg-muted px-4 py-3 text-sm">
              First job card for <span className="font-medium">{year}</span> will be:{" "}
              <span className="font-mono font-bold text-primary">{previewNumber}</span>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                This <strong>resets the counter</strong>. The very next job card issued will use
                your number, then continue: {previewNumber}, {`OR${String(year).slice(-2)}${String(startingSequence + 1).padStart(5, "0")}`},{" "}
                {`OR${String(year).slice(-2)}${String(startingSequence + 2).padStart(5, "0")}`}…
              </span>
            </div>

            <Button
              onClick={() => sequenceMutation.mutate()}
              disabled={sequenceMutation.isPending || startingSequence < 1 || year < 2020}
              size="sm"
            >
              {sequenceMutation.isPending ? "Saving…" : "Save Sequence"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
