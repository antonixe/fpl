"use client";

import { FPLProvider } from "@/lib/use-fpl-data";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";
import type { FPLInitialData } from "@/lib/fpl-server";

interface ProvidersProps {
  children: React.ReactNode;
  initialData?: FPLInitialData;
}

export function Providers({ children, initialData }: ProvidersProps) {
  return (
    <ThemeProvider>
      <FPLProvider initialData={initialData}>
        <ToastProvider>
          <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navigation />
            {children}
          </div>
        </ToastProvider>
      </FPLProvider>
    </ThemeProvider>
  );
}
