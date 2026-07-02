import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "sonner";
import { PwaInstallPrompt } from "@/components/pwa/install-prompt";
import { ThemeColorApplicator } from "@/components/providers/theme-color-applicator";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Rwandamotor - CSSR", template: "%s | Rwandamotor CSSR" },
  description: "Customer Service & Sales Retention Platform — Rwanda Multi-Brand Automotive DMS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CSSR" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="bottom-right"
                richColors
                closeButton
                duration={4000}
                toastOptions={{
                  classNames: {
                    toast: "!rounded-xl !border !border-border !shadow-xl !text-sm !font-medium",
                    title: "!font-semibold",
                    description: "!text-muted-foreground !text-xs",
                    closeButton: "!border-border hover:!bg-muted",
                  },
                }}
              />
              <ThemeColorApplicator />
              <PwaInstallPrompt />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
