import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Lead Finder",
  description: "Discover AI educational YouTube channels to pitch your editing service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
