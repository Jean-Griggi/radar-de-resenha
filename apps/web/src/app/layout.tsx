import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Outfit } from 'next/font/google';
import { PlayerProvider } from '@/components/Player';
import { ThemeProvider } from '@/components/Theme';
import { ToastProvider } from '@/components/Toast';
import { WaveBackground } from '@/components/WaveBackground';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Resenhômetro',
  description: 'Rede social de experiências, rolês e memórias',
};

const themeScript = `try{var t=localStorage.getItem('resenhometro_theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}else if(window.matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light'}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${outfit.className} min-h-screen`}>
        <ThemeProvider>
          <WaveBackground />
          <ToastProvider>
            <PlayerProvider>{children}</PlayerProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
