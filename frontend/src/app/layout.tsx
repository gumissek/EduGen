import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { ColorModeProvider } from '@/theme/ColorModeContext';
import AppProviders from './AppProviders';
import { queryClient } from '@/lib/queryClient';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'EduGen Local',
  description: 'AI-powered education material generator.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <ColorModeProvider>
          <ThemeRegistry>
            <AppProviders>{children}</AppProviders>
          </ThemeRegistry>
        </ColorModeProvider>
      </body>
    </html>
  );
}


