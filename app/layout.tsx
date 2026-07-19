import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Blink & Bliss CRM", template: "%s | Blink & Bliss" },
  description: "Manage leads, follow-ups, and sales team performance",
  robots: { index: false, follow: false },
  icons: { icon: "/icon-fitted.png", apple: "/icon-fitted.png" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Preconnect to Supabase for faster API calls */}
        <link rel="preconnect" href="https://yikqokyvibvvjhwvluce.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://yikqokyvibvvjhwvluce.supabase.co" />
        {/* Prevent FOUC */}
        <style dangerouslySetInnerHTML={{ __html: "html{visibility:visible;opacity:1}" }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
