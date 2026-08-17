import type { Metadata } from "next";
import { Nunito_Sans, Playfair_Display } from "next/font/google";
import AuthHashHandler from "@/components/AuthHashHandler";
import "./globals.css";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SEPi Portal",
  description:
    "Sigma Eta Pi at Miami University — the New Member Education portal. Member companies, people, and the investment window.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} ${playfair.variable}`}>
      {/* suppressHydrationWarning: browser extensions inject attributes into
          <body> before React hydrates; that mismatch is noise, not a bug. */}
      <body suppressHydrationWarning className="min-h-screen bg-cream text-midnight">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
