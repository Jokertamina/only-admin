"use client"; // Este archivo sí puede usar Client Components

import { ReactNode } from "react";
import { EmpresaProvider } from "../context/EmpresaContext";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

export default function ClientWrapper({ children }: { children: ReactNode }) {
  return (
    <EmpresaProvider>
      <NavBar />
      {children}
      <Footer />
    </EmpresaProvider>
  );
}
