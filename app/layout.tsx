import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "Dessert Valley — Cozy Dessert Atelier",
    description:
      "Collect ideas, shape references, build recipes and plan bake day in a cozy pixel-farm dessert atelier.",
    openGraph: {
      title: "Dessert Valley — Cozy Dessert Atelier",
      description: "A cozy dessert atelier for ideas, recipes and bake-day planning.",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Dessert Valley — Cozy Dessert Atelier",
      description: "A cozy dessert atelier for ideas, recipes and bake-day planning.",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
