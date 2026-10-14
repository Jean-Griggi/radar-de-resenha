import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { PlayerProvider } from '@/components/Player';
import { ThemeProvider } from '@/components/Theme';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

/* Fontes da Kina (DECISOES.md T3): cada instância define uma variável `--k-font-*`, usada em kina-tokens.css. */
const fraunces = localFont({
  src: [
    { path: '../fonts/fraunces-latin-full-normal.woff2', weight: '100 900', style: 'normal' },
    { path: '../fonts/fraunces-latin-full-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--k-font-display',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

const schibstedGrotesk = localFont({
  src: [
    { path: '../fonts/schibsted-grotesk-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/schibsted-grotesk-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/schibsted-grotesk-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/schibsted-grotesk-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--k-font-ui',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
});

const plexMono = localFont({
  src: [
    { path: '../fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/ibm-plex-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--k-font-mono',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'Courier New', 'monospace'],
});

/* Exceção aprovada ao "nenhum hexadecimal" (DECISOES.md §3): metadado do navegador não lê variável CSS. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3EEE4' },
    { media: '(prefers-color-scheme: dark)', color: '#14120F' },
  ],
};

export const metadata: Metadata = {
  title: 'Kina',
  description: 'Te vejo na Kina. Combina o rolê, chega junto, guarda o que rolou.',
  applicationName: 'Kina',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Kina',
    description: 'Te vejo na Kina. Combina o rolê, chega junto, guarda o que rolou.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

/*
 * Anti-flash (DECISOES.md T5): só marca o tema quando a pessoa já escolheu um (`light`/`dark`).
 * Sem valor salvo o atributo fica ausente e o CSS segue o sistema (`prefers-color-scheme`).
 */
const themeScript = `try{var t=localStorage.getItem('resenhometro_theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${fraunces.variable} ${schibstedGrotesk.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="k-grain min-h-screen antialiased">
        <ThemeProvider>
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
