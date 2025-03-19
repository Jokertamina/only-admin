"use client"; // Necesario para usar useEffect y useState

import { useEffect, useState } from "react";
import { useEmpresa } from "../context/EmpresaContext";
import PricingCard from "../components/PricingCard";
import CustomModal from "../components/CustomModal";
import styles from "../styles/PricingPage.module.css"; // Importación como módulo

const PricingPage: React.FC = () => {
  // Obtenemos empresaId, loading y empresaData (que incluye plan, email y contactPhone)
  const { empresaId, loading, empresaData } = useEmpresa();

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Obtenemos el plan actual o "SIN_PLAN" si no existe
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

  // Función para iniciar la compra de planes estándar
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
    if (plan === currentPlan) {
      setModalMessage("Ya tienes contratado este plan. No es necesario volver a comprarlo.");
      setShowModal(true);
      return;
    }
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

  // Función para el plan personalizado:
  // - Primero notifica al admin con email y contactPhone.
  // - Luego muestra un modal informativo.
  const handleCustomPlan = async () => {
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
    const email = empresaData?.email || "Sin email registrado";
    const contactPhone = empresaData?.contactPhone || "Sin teléfono registrado";
    try {
      const res = await fetch("/api/notify-custom-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          email,
          contactPhone,
          plan: "Personalizado",
        }),
      });
      const result = await res.json();
      console.log("Notificación a admin:", result);
    } catch (error) {
      console.error("Error notificando plan personalizado:", error);
    }
    setModalMessage(
      "Gracias por elegir el plan personalizado. Nuestro equipo se pondrá en contacto contigo para adaptar la herramienta a tus necesidades. Una vez definidos los detalles, se te cobrará el pago inicial acordado y, a partir del siguiente mes, se activará la cuota mensual de 55€."
    );
    setShowModal(true);
  };

  // Función para proceder al pago del plan personalizado, si ya se ha acordado el setupFee en Firestore.
  const handleCustomPlanPayment = async () => {
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
      const res = await fetch("/api/stripe-create-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId }),
      });
      if (!res.ok) throw new Error("La petición falló");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Error al crear sesión de pago personalizado:", error);
      setModalMessage("Hubo un problema al iniciar el pago. Inténtalo de nuevo.");
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

        {/* Card Personalizado */}
        {/* Si la empresa ya tiene el plan personalizado, asumimos que ya se acordó el setupFee y mostramos "Plan actual"
            De lo contrario, mostramos "Contactar" para notificar y luego proceder al pago */}
        <PricingCard
          plan="Personalizado"
          price="Pago inicial + 55€/mes"
          features={[
            "Coste inicial variable según acuerdo",
            "Cuota mensual de 55€",
            "Personalización según tus necesidades",
            "Asesoramiento personalizado",
          ]}
          buttonText={currentPlan === "CUSTOM" ? "Plan actual" : "Contactar"}
          onBuy={currentPlan === "CUSTOM" ? handleCustomPlanPayment : handleCustomPlan}
          disabled={currentPlan === "CUSTOM"}
        />
      </div>

      <CustomModal
        isOpen={showModal}
        title=""
        message={modalMessage}
        type="alert"
        onConfirm={() => setShowModal(false)}
      />
    </main>
  );
};

export default PricingPage;
