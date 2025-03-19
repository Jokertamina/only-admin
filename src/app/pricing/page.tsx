"use client"; // Necesario para usar useEffect y useState

import { useEffect, useState } from "react";
// IMPORTAMOS EL plan actual desde tu contexto
import { useEmpresa } from "../context/EmpresaContext";
import PricingCard from "../components/PricingCard";
import styles from "../styles/PricingPage.module.css"; // Importación como módulo

const PricingPage: React.FC = () => {
  // Suponemos que en tu contexto tienes: empresaId, loading, y empresaData con el campo plan
  const { empresaId, loading, empresaData } = useEmpresa();

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Obtenemos el plan actual de la empresa, o "SIN_PLAN" si no existe
  const currentPlan = empresaData?.plan || "SIN_PLAN";

  useEffect(() => {
    console.log(
      "[PricingPage] empresaId:",
      empresaId,
      "loading:",
      loading,
      "currentPlan:",
      currentPlan
    );
  }, [empresaId, loading, currentPlan]);

  // Función genérica para iniciar la compra
  const handleBuyPlan = async (plan: string) => {
    // 1. Si estamos cargando, mostramos un mensaje
    if (loading) {
      setModalMessage("Cargando información, por favor espera...");
      setShowModal(true);
      return;
    }

    // 2. Si no hay empresaId, forzamos a loguearse o mostrar un error
    if (!empresaId) {
      setModalMessage("Debes iniciar sesión para contratar un plan.");
      setShowModal(true);
      return;
    }

    // 3. Si ya tiene este plan, mostramos un aviso en lugar de comprar
    if (plan === currentPlan) {
      setModalMessage("Ya tienes contratado este plan. No es necesario volver a comprarlo.");
      setShowModal(true);
      return;
    }

    // 4. Llamamos a nuestro endpoint de Stripe
    try {
      const res = await fetch("/api/stripe-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, empresaId }),
      });

      if (!res.ok) throw new Error("La petición falló");

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Error iniciando sesión de pago:", error);
      setModalMessage("Hubo un problema al iniciar la compra. Inténtalo de nuevo.");
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
        {/* Card Básico */}
        <PricingCard
          plan="Básico"
          price="€14,99/mes"
          features={[
            "Acceso limitado a funciones",
            "3 Registros de empleados",
            "3 Registros de obras",
            "Soporte básico",
          ]}
          buttonText={currentPlan === "BASICO" ? "Plan actual" : "Elegir plan"}
          onBuy={() => handleBuyPlan("BASICO")}
          disabled={currentPlan === "BASICO"}
        />

        {/* Card Premium */}
        <PricingCard
          plan="Premium"
          price="€29,99/mes"
          features={[
            "Acceso ilimitado a funciones",
            "Registros de empleados ilimitados",
            "Registros de obras ilimitados",
            "Soporte Premium",
          ]}
          buttonText={currentPlan === "PREMIUM" ? "Plan actual" : "Elegir plan"}
          onBuy={() => handleBuyPlan("PREMIUM")}
          disabled={currentPlan === "PREMIUM"}
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
