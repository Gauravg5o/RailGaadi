import type { Metadata } from "next";
import "./globals.css";
import ReactQueryProvider from "@/providers/ReactQueryProvider";

export const metadata: Metadata = {
  title: "RailGaadi — Live Train Intelligence Platform",
  description: "Real-time train tracking, interactive maps, weather integration, and journey analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans" suppressHydrationWarning>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
