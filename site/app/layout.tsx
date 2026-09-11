import type { Metadata } from "next";
import "./globals.css";
import "./mobile.css";

export const metadata: Metadata = {
  title: "CrossOdds — correlated DreamDEX prediction baskets",
  description: "Relationship-aware prediction baskets and AI-readable market intelligence for DreamDEX Event Contracts on Somnia.",
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
