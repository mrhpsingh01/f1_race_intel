import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/nav/Navbar';
import { DriverModalProvider } from '@/context/DriverModalContext';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'F1 Race Intelligence // Pit Wall Cockpit',
  description: 'Formula 1 Live Race Intelligence, Telemetry Duel, and Podium Predictor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-carbon-asphalt text-pure-white min-h-screen selection:bg-f1-crimson selection:text-pure-white`}>
        <DriverModalProvider>
          <Navbar />
          <main className="pt-14 bg-grid-cockpit min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
        </DriverModalProvider>
      </body>
    </html>
  );
}
