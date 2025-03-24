"use client";

import { ReactNode, useState } from "react";
import { EmpresaProvider } from "../context/EmpresaContext";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import CookieBanner from "../components/CookieBanner";
import CookiePreferencesModal from "../components/CookiePreferencesModal";

export default function ClientWrapper({ children }: { children: ReactNode }) {
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false);

  const handlePersonalize = () => setShowPersonalizeModal(true);
  const handleCloseModal = () => setShowPersonalizeModal(false);

  return (
    <EmpresaProvider>
      <NavBar />
      {children}
      <Footer />
      <CookieBanner onPersonalize={handlePersonalize} />
      {showPersonalizeModal && <CookiePreferencesModal onClose={handleCloseModal} />}
    </EmpresaProvider>
  );
}
