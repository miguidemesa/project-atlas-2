import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: {
    default: "Atlas — NBA Card Marketplace Philippines",
    template: "%s · Atlas",
  },
  description:
    "Buy and sell NBA, Pokémon, One Piece and Disney trading cards in the Philippines. Live auctions, graded slabs, sealed boxes — priced in pesos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {/*
          THESIS: the card is a physical object under gallery light, not an ecommerce SKU —
          every listing renders as a tiltable slab of foil and depth, refusing the
          flat white-grid marketplace template.
          OWN-WORLD: near-black steel surfaces (#141517→#242628), warm ivory text,
          champagne gold reserved for prices and primary action; Bricolage Grotesque
          carries prices as the loudest type on any screen; JetBrains Mono owns
          countdowns and market data.
          STORY: a collector scans live market movement in seconds, feels card
          physicality on hover, trusts sellers through visible track record, acts.
          FIRST VIEWPORT: ticker of player price movement across the top edge; below
          it a search-led hero with category chips and featured cards at 3/4 aspect
          tilting toward the cursor; primary action is search itself.
          FORM: established world from DESIGN.md (card-as-hero, dark-first).
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
        */}
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
