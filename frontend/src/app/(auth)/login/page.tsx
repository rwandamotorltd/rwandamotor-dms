"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@rwandamotor.com");
  const [password, setPassword] = useState("Admin@123!");
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Rwandamotor DMS</h1>
            <p className="text-sm text-muted-foreground mt-1">Retention & Service Intelligence Platform</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email" type="email" autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@rwandamotor.com" required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-2">Demo credentials</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: "Admin", email: "admin@rwandamotor.com", pwd: "Admin@123!" },
                  { role: "Director", email: "director@rwandamotor.com", pwd: "Director@123!" },
                  { role: "CRM", email: "crm@rwandamotor.com", pwd: "Crm@123!" },
                ].map(d => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword(d.pwd); }}
                    className="text-[11px] bg-muted hover:bg-muted/80 rounded-md px-2 py-1.5 text-center transition-colors"
                  >
                    <span className="block font-medium text-foreground">{d.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 Rwandamotor — Enterprise DMS Platform
        </p>
      </motion.div>
    </div>
  );
}
