import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GoBridge",
  description: "Bridge • Swap • Liquidity",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans bg-black`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
