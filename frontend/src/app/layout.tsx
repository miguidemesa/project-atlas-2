import type { Metadata } from "next";
import { JetBrains_Mono, Onest, Unbounded } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { loadCategories } from "@/lib/api";
import "./globals.css";

// latin-ext carries the peso sign, so prices set in the display face keep it
const unbounded = Unbounded({ subsets: ["latin", "latin-ext"], variable: "--font-unbounded" });
const onest = Onest({ subsets: ["latin", "latin-ext"], variable: "--font-onest" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: {
    default: "Atlas — Trading Card Marketplace Philippines",
    template: "%s · Atlas",
  },
  description:
    "Buy and sell trading cards for every game and sport in the Philippines: Pokémon, One Piece, Basketball, Lorcana and 25 more. Priced in pesos.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const categories = await loadCategories().catch(() => []); // the header still renders when the API is down
  return (
    <html lang="en" className={`dark ${unbounded.variable} ${onest.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-on-accent">
          Skip to content
        </a>
        <Providers categories={categories}>
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
