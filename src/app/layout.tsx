import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app/AppShell";
import "./globals.css";

// Editorial pair: a clean grotesque for text and headlines, an elegant serif
// for the italic accent words inside them.
const sans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const serif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weavr — an AI tutor with a memory",
  description: "An agentic tutor that writes, checks, and remembers your lessons.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      style={{ colorScheme: "dark" }}
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
