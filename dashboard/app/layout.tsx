import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Vault — AI Research Signal",
    template: "%s · Vault",
  },
  description: "Where AI research is heading: a market-intelligence dashboard over the paper vault.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="grain min-h-full flex flex-col font-sans">
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-baseline gap-2">
              <span className="font-display text-xl italic tracking-tight text-foreground">
                Vault
              </span>
              <span className="hidden font-mono text-[10px] tracking-[0.22em] uppercase text-primary/80 sm:inline">
                research signal
              </span>
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-border py-6">
          <p className="mx-auto max-w-6xl px-4 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground sm:px-6">
            vault dashboard · reads the markdown vault live
          </p>
        </footer>
      </body>
    </html>
  );
}
