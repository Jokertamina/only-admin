"use client"; // Indica que este componente usa hooks en Next.js 13

import { useEffect, useState } from "react";
import { useEmpresa } from "../context/EmpresaContext";
import PricingCard from "../components/PricingCard";
import CustomModal from "../components/CustomModal";
import Loading from "../components/Loading"; // Componente Loading
import styles from "../styles/PricingPage.module.css";

const PricingPage: React.FC = () => {
  // Obtenemos empresaId, loading y empresaData (que incluye plan, email y contactPhone)
  const { empresaId, loading, empresaData } = useEmpresa();

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  // Nuevo estado para saber si se requiere confirmar upgrade (Básico → Premium)
  const [confirmUpgrade, setConfirmUpgrade] = useState(false);

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

    // Si se intenta pasar de BASICO a PREMIUM, no se crea nueva sesión de pago;
    // se actualiza automáticamente tras confirmación.
    if (plan === "PREMIUM" && currentPlan === "BASICO") {
      setModalMessage("El cambio a Premium se realizará automáticamente sin sesión de pago. ¿Deseas proceder?");
      setConfirmUpgrade(true);
      setShowModal(true);
      return;
    }

    // Caso normal: se crea sesión de checkout.
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

  // Función para realizar el upgrade automático (Básico → Premium)
  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/stripe-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PREMIUM", empresaId }),
      });
      if (!res.ok) throw new Error("La petición falló");
      const data = await res.json();
      // En upgrade, no se genera sesión de pago, se actualiza automáticamente.
      if (data.message) {
        setModalMessage(data.message);
      } else {
        setModalMessage("Plan actualizado a Premium de forma inmediata.");
      }
    } catch (error) {
      console.error("Error al actualizar a Premium:", error);
      setModalMessage("Hubo un problema al actualizar el plan. Inténtalo de nuevo.");
    }
    setConfirmUpgrade(false);
    setShowModal(true);
  };

  // Función para el plan personalizado
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

  // Dummy para evitar warnings de variables no usadas
  const _customPlanHandlers = { handleCustomPlan, handleCustomPlanPayment };
  console.log("Custom plan handlers reservados:", _customPlanHandlers);

  if (loading) {
    return <Loading />;
  }

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

      <CustomModal
        isOpen={showModal}
        title=""
        message={modalMessage}
        type="alert"
        onConfirm={() => {
          setShowModal(false);
          if (confirmUpgrade) {
            handleUpgrade();
          }
        }}
      />
    </main>
  );
};

export default PricingPage;
