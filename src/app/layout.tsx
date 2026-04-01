import type { Metadata, Viewport } from "next";
import "./globals.css";
import CreditCounter from "@/components/CreditCounter";

export const metadata: Metadata = {
  title: "Où on part ?",
  description: "Trouve ta destination de voyage idéale grâce à l'IA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Où on part ?",
  },
};

export const viewport: Viewport = {
  themeColor: "#534AB7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased bg-white text-gray-900 min-h-screen">
        <main className="max-w-lg mx-auto">
          {children}
        </main>
        <CreditCounter />
      </body>
    </html>
  );
}
