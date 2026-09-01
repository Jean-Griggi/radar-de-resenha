import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { PlayerProvider } from '@/components/Player';
import { ThemeProvider } from '@/components/Theme';
import { ToastProvider } from '@/components/Toast';
import { WaveBackground } from '@/components/WaveBackground';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '700'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3eee4' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0f' },
  ],
};

export const metadata: Metadata = {
  title: 'Redesinha',
  description: 'Seus rolês. Suas pessoas. Sua rede.',
  applicationName: 'Redesinha',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-32-light.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

const themeScript = `try{var t=localStorage.getItem('resenhometro_theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}else if(window.matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light'}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${plusJakartaSans.className} min-h-screen antialiased`}>
        <ThemeProvider>
          <WaveBackground />
          <div className="relative z-10">
            <ToastProvider>
              <PlayerProvider>{children}</PlayerProvider>
            </ToastProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

