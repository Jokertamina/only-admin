"use client"; // Necesario para usar useEffect y useState

import { useEffect, useState } from "react";
import { useEmpresa } from "../context/EmpresaContext";
import PricingCard from "../components/PricingCard";
import styles from "../styles/PricingPage.module.css"; // Importación como módulo

const PricingPage: React.FC = () => {
  const { empresaId, loading } = useEmpresa();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    console.log("[PricingPage] empresaId:", empresaId, "loading:", loading);
  }, [empresaId, loading]);

  const handleBuyPlan = async (plan: string) => {
    if (loading) {
      setModalMessage("Cargando información, por favor espera...");
      setShowModal(true);
      return;
    }

    if (!empresaId) {
      setModalMessage("Debes iniciar sesión para contratar un plan.");
      setShowModal(true);
      return;
    }

    try {
      const res = await fetch('/api/stripe-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, empresaId }),
      });

      if (!res.ok) throw new Error('La petición falló');

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Error iniciando sesión de pago:', error);
      setModalMessage('Hubo un problema al iniciar la compra. Inténtalo de nuevo.');
      setShowModal(true);
    }
  };

  return (
    <main className={styles["pricing-container"]}>
      <h1 className={styles["pricing-title"]}>Precios</h1>
      <p className={styles["pricing-description"]}>
        Descubre el plan que mejor se adapta a tus necesidades.
      </p>
      <div className={styles["pricing-cards"]}>
        <PricingCard
          plan="Básico"
          price="$9.99/mes"
          features={[
            "Acceso limitado a funciones",
            "Soporte básico",
            "1 proyecto activo",
          ]}
          buttonText="Elegir plan"
          onBuy={() => handleBuyPlan("BASICO")}
        />
        <PricingCard
          plan="Premium"
          price="$19.99/mes"
          features={[
            "Funciones ilimitadas",
            "Soporte premium",
            "Proyectos ilimitados",
          ]}
          buttonText="Elegir plan"
          onBuy={() => handleBuyPlan("PREMIUM")}
        />
      </div>

      {showModal && (
        <div className={styles["modal-backdrop"]}>
          <div className={styles["modal-content"]}>
            <p>{modalMessage}</p>
            <button onClick={() => setShowModal(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default PricingPage;
