import type { Metadata } from "next";
import { Syne, DM_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "HACK ARENA // Build. Submit. Dominate.",
  description: "Dynamic submission and live ranking standings for hackathon innovators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable}`}>
      <body>
        <div className="noise-overlay" />
        <div className="glow-orb glow-violet" />
        <div className="glow-orb glow-cyan" />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
