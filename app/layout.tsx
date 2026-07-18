import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import BackButtonHandler from '@/components/BackButtonHandler';
import PullToRefresh from '@/components/PullToRefresh';
import NetworkStatus from '@/components/NetworkStatus';
import AnimatedLaunchScreen from '@/components/AnimatedLaunchScreen';
import PushNotificationSetup from '@/components/PushNotificationSetup';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { NetworkAware } from '@/components/NetworkAware';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Blink & Bliss CRM',
    template: '%s | Blink & Bliss CRM',
  },
  description:
    'Blink & Bliss CRM — manage leads, follow-ups, and sales team performance in one place.',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/icon-fitted.png',
  },
  // Preconnect to optimize third-party resources
  themeColor: '#0d0d0d',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0d0d0d',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preload critical resources */}
        <link rel="preload" as="image" href="/icon-fitted.png" />
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://cdn.vercel.app" />
      </head>
      <body className="min-h-full flex flex-col">
        <AnimatedLaunchScreen>
          <NetworkAware>
            <PushNotificationSetup />
            <BackButtonHandler />
            <NetworkStatus>
              <PullToRefresh>
                <OfflineIndicator />
                {children}
              </PullToRefresh>
            </NetworkStatus>
          </NetworkAware>
        </AnimatedLaunchScreen>
      </body>
    </html>
  );
}
