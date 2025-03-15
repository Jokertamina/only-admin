import "@/app/globals.css";

export const metadata = {
  title: "Symcrox",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}

import ClientWrapper from "./components/ClientWrapper"; // Importamos el wrapper
