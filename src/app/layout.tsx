"use client"; // Necesario para poder usar Providers en App Router

import { ReactNode } from "react";
import { EmpresaProvider } from "./context/EmpresaContext";
import NavBar from "./components/NavBar";
import "@/app/globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <EmpresaProvider>
          <NavBar /> {/* Aparece en todas las páginas */}
          {children} {/* Aquí se renderiza cada ruta */}
        </EmpresaProvider>
      </body>
    </html>
  );
}
