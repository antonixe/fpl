import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { WebVitals } from "@/components/WebVitals";
import { getInitialData } from "@/lib/fpl-server";
import type { FPLInitialData } from "@/lib/fpl-server";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { Footer } from "@/components/Footer";
import { RouteProgress } from "@/components/RouteProgress";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fpl.example.com";

export const metadata: Metadata = {
  title: {
    default: "FPLGRID — Data-Driven FPL Analysis",
    template: "%s | FPLGRID",
  },
  description:
    "Analyze FPL players, optimize your team, and dominate your mini-leagues with data-driven insights.",
  metadataBase: new URL(BASE_URL),
  keywords: [
    "FPL",
    "Fantasy Premier League",
    "FPL analysis",
    "FPL optimizer",
    "Fantasy Football",
    "Premier League",
    "team optimizer",
  ],
  authors: [{ name: "FPLGRID" }],
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "FPLGRID",
    title: "FPLGRID — Data-Driven FPL Analysis",
    description:
      "Analyze FPL players, optimize your team, and dominate your mini-leagues with data-driven insights.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FPLGRID — Data-Driven FPL Analysis",
    description:
      "Analyze FPL players, optimize your team, and dominate your mini-leagues.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch FPL data server-side for instant first paint (ISR cached 5 min)
  let initialData: FPLInitialData | undefined;
  try {
    initialData = await getInitialData();
  } catch {
    // Server fetch failed — FPLProvider will fall back to client-side fetch
  }

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fpl-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers initialData={initialData}>
          <RouteProgress />
          <WebVitals />
          <KeyboardShortcuts />
          <ShortcutHelp />
          <div id="main-content">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
