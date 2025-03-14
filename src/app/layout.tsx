

import { ReactNode } from "react";
import { EmpresaProvider } from "./context/EmpresaContext";
import NavBar from "./components/NavBar";
import "@/app/globals.css";
import Head from "next/head";

export const metadata = {
  title: "Symcrox",
  icons: {
    icon: "/favicon.svg", // Usa SVG
    shortcut: "/favicon.ico", // Alternativa por compatibilidad
    apple: "/favicon.png", // Para iOS
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
