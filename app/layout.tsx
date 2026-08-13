import type { Metadata, Viewport } from "next";

import { fraunces, karla } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "SEPi NME",
  description: "Sigma Eta Pi — New Member Education",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable}`}>
      <body>{children}</body>
    </html>
  );
}
