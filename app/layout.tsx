import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tracker — WorkOS",
  description: "A calm, focused dashboard for the WorkOS execution layer — what matters now.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
