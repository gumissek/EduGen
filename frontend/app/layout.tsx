import "./globals.css";

import Providers from "../components/Providers";

export const metadata = {
  title: "EduGen Local",
  description: "Lokalne generowanie materiałów dydaktycznych",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
