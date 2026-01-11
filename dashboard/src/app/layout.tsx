import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Obsidian | Intelligence Dashboard",
  description: "Automated Twitter Engagement with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased flex`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto h-screen relative">
          {/* subtle background pattern or overlay if needed */}
          <div className="p-10 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
