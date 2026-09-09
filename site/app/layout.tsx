import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Readout — correlated DreamDEX prediction baskets", description: "Relationship-aware prediction baskets and AI-readable market intelligence for DreamDEX Event Contracts on Somnia." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
