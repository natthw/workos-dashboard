import type { Metadata } from "next";
import { Spectral, DM_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted, preloaded, swap — replaces the render-blocking Google Fonts
// @import. Exposed as CSS variables consumed by --serif / --sans in globals.css.
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WorkOS Dashboard",
  description: "A calm, focused dashboard for the WorkOS execution layer — what matters now.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spectral.variable} ${dmSans.variable}`}>
      {/* suppressHydrationWarning: browser extensions inject attributes on <body>
          (e.g. id="dummybodyid") before React hydrates — harmless, but it would
          otherwise trip React's hydration attribute check. Scoped to <body> only. */}
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
