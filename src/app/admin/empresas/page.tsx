"use client"; // Indica que este componente usa hooks en Next.js 13

import { useEffect, useState } from "react";
import app, { auth, db } from "../../../lib/firebaseConfig"; 
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import styles from "../../styles/EmpresasPage.module.css";

// Importamos funciones de Firebase Functions (SDK de cliente)
import { getFunctions, httpsCallable } from "firebase/functions";

type PlanType = "SIN_PLAN" | "BASICO" | "PREMIUM";

interface SubscriptionData {
  renewalDate?: string;
  expiryDate?: string;
  status?: string;
}

interface Empresa {
  id: string;
  nombre: string;
  domicilio?: string;
  nif?: string;
  contactPhone?: string | null;
  plan?: PlanType;
  subscriptionId?: string;
  subscriptionData?: SubscriptionData;
}

interface CustomModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type: "alert" | "confirm";
  onConfirm: () => void;
  onCancel?: () => void;
}

function CustomModal({
  isOpen,
  title,
  message,
  type,
  onConfirm,
  onCancel,
}: CustomModalProps) {
  if (!isOpen) return null;
  return (
    <div className={styles["modal-overlay"]}>
      <div className={styles["modal-container"]}>
        {title && <h2 className={styles["modal-title"]}>{title}</h2>}
        <p className={styles["modal-message"]}>{message}</p>
        <div className={styles["modal-buttons"]}>
          {type === "confirm" ? (
            <>
              <button onClick={onConfirm} className={styles["modal-btn-confirm"]}>
                Confirmar
              </button>
              <button onClick={onCancel} className={styles["modal-btn-cancel"]}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={onConfirm} className={styles["modal-btn-ok"]}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmpresasPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState<Partial<Empresa>>({});

  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newEmpresaData, setNewEmpresaData] = useState({
    nombre: "",
    domicilio: "",
    nif: "",
    contactPhone: "",
  });

  const [userDocId, setUserDocId] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm";
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // ==========================
  //     Carga la Empresa
  // ==========================
  useEffect(() => {
    async function fetchEmpresaForUser() {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const usersQuery = query(
          collection(db, "Users"),
          where("uid", "==", currentUser.uid)
        );
        const usersSnapshot = await getDocs(usersQuery);
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          setUserDocId(userDoc.id);
          const userData = userDoc.data();
          const empresaId = userData.empresaId;
          if (empresaId) {
            const empresaRef = doc(db, "Empresas", empresaId);
            const empresaSnap = await getDoc(empresaRef);
            if (empresaSnap.exists()) {
              setEmpresa({
                id: empresaSnap.id,
                ...empresaSnap.data(),
              } as Empresa);
            }
          }
        }
      }
      setLoading(false);
    }
    fetchEmpresaForUser();
  }, []);

  // ==========================
  //   Datos de Suscripción
  // ==========================
  useEffect(() => {
    async function fetchSubscriptionDetails() {
      if (empresa?.subscriptionId) {
        try {
          const res = await fetch(
            `/api/subscription-details?subscriptionId=${empresa.subscriptionId}`
          );
          const data = await res.json();
          if (data.success && data.subscriptionData) {
            setEmpresa((prev) =>
              prev ? { ...prev, subscriptionData: data.subscriptionData } : prev
            );
          }
        } catch (err) {
          console.error("Error al obtener datos de la suscripción:", err);
        }
      }
    }
    fetchSubscriptionDetails();
  }, [empresa?.subscriptionId]);

  // ==========================
  //   Edición de la Empresa
  // ==========================
  const handleEdit = () => {
    if (empresa) {
      setFormData({
        nombre: empresa.nombre,
        domicilio: empresa.domicilio || "",
        nif: empresa.nif || "",
        contactPhone: empresa.contactPhone || "",
      });
      setEditMode(true);
    }
  };

  const handleChange = (field: keyof Empresa, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!empresa) return;
    const empresaRef = doc(db, "Empresas", empresa.id);
    try {
      await updateDoc(empresaRef, formData);
      setEmpresa((prev) => (prev ? { ...prev, ...formData } : prev));
      setEditMode(false);
    } catch (err) {
      console.error("Error al actualizar:", err);
    }
  };

  // ==========================
  //  Registro de Empresa
  // ==========================
  const handleNewEmpresaChange = (
    field: keyof typeof newEmpresaData,
    value: string
  ) => {
    setNewEmpresaData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateNewEmpresa = async () => {
    if (!userDocId) return;
    try {
      const docRef = await addDoc(collection(db, "Empresas"), {
        nombre: newEmpresaData.nombre,
        domicilio: newEmpresaData.domicilio,
        nif: newEmpresaData.nif,
        contactPhone: newEmpresaData.contactPhone,
        plan: "SIN_PLAN",
      });
      const nuevaEmpresaId = docRef.id;
      await updateDoc(doc(db, "Users", userDocId), {
        empresaId: nuevaEmpresaId,
      });
      const empresaRef = doc(db, "Empresas", nuevaEmpresaId);
      const empresaSnap = await getDoc(empresaRef);
      if (empresaSnap.exists()) {
        setEmpresa({ id: empresaSnap.id, ...empresaSnap.data() } as Empresa);
      }
      setShowRegisterForm(false);
    } catch (err) {
      console.error("Error al crear la empresa:", err);
    }
  };

  // ==========================
  //  Cancelar Suscripción
  // ==========================
  const handleCancelSubscription = async () => {
    if (!empresa?.subscriptionId) {
      setModalData({
        isOpen: true,
        type: "alert",
        title: "Aviso",
        message: "No tienes una suscripción activa.",
        onConfirm: () => setModalData(null),
      });
      return;
    }

    // Mostrar modal de confirmación
    setModalData({
      isOpen: true,
      type: "confirm",
      title: "Confirmación",
      message:
        "¿Estás seguro que deseas cancelar la suscripción? Continuará activa hasta el fin del periodo actual.",
      onConfirm: async () => {
        setModalData(null);
        try {
          const res = await fetch("/api/cancel-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId: empresa.subscriptionId }),
          });
          const data = await res.json();
          if (data.success) {
            setModalData({
              isOpen: true,
              type: "alert",
              title: "Éxito",
              message:
                "Suscripción cancelada correctamente. Seguirá activa hasta finalizar el periodo actual.",
              onConfirm: () => setModalData(null),
            });
          } else {
            setModalData({
              isOpen: true,
              type: "alert",
              title: "Error",
              message: `Error: ${data.message}`,
              onConfirm: () => setModalData(null),
            });
          }
        } catch (err) {
          console.error("Error al cancelar la suscripción:", err);
          setModalData({
            isOpen: true,
            type: "alert",
            title: "Error",
            message: "Error inesperado al cancelar la suscripción.",
            onConfirm: () => setModalData(null),
          });
        }
      },
      onCancel: () => setModalData(null),
    });
  };

  // ==========================
//  ELIMINAR CUENTA Y DATOS
// ==========================
const handleDeleteAccount = () => {
  setModalData({
    isOpen: true,
    type: "confirm",
    title: "Eliminar cuenta",
    message:
      "Esta acción borrará tu cuenta, tu empresa y todos los datos relacionados (empleados, obras, fichajes). ¿Estás seguro?",
    onConfirm: async () => {
      setModalData(null);
      try {
        // Si hay una suscripción activa, invocamos la eliminación de la suscripción
        if (empresa?.subscriptionId) {
          await fetch("/api/subscription-deleted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId: empresa.subscriptionId }),
          });
          // Esperamos unos segundos para que Stripe y el webhook procesen la cancelación
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        // Llamamos a la función callable para eliminar la cuenta
        const functions = getFunctions(app);
        const deleteUserAccount = httpsCallable(functions, "deleteUserAccount");
        const result = await deleteUserAccount({});
        console.log("deleteUserAccount result:", result);
        setModalData({
          isOpen: true,
          type: "alert",
          title: "Cuenta eliminada",
          message:
            "Se ha eliminado tu cuenta y todos los datos asociados. Se cerrará tu sesión automáticamente.",
          onConfirm: () => {
            setModalData(null);
            auth.signOut().then(() => {
              window.location.href = "/";
            });
          },
        });
      } catch (error: unknown) {
        console.error("Error al eliminar la cuenta:", error);
        setModalData({
          isOpen: true,
          type: "alert",
          title: "Error",
          message:
            "Ocurrió un error al eliminar la cuenta. Revisa la consola o inténtalo más tarde.",
          onConfirm: () => setModalData(null),
        });
      }
    },
    onCancel: () => setModalData(null),
  });
};


  // ==========================
  //  Loading y Sin Empresa
  // ==========================
  if (loading) {
    return <p className={styles["empresas-loading"]}>Cargando empresa...</p>;
  }

  if (!empresa) {
    return (
      <main className={styles["empresas-container"]}>
        <h1 className={styles["empresas-title"]}>Mi Empresa</h1>
        {!showRegisterForm ? (
          <div>
            <p>No se encontró la empresa asociada a este usuario.</p>
            <button
              className={styles["empresas-btn-register"]}
              onClick={() => setShowRegisterForm(true)}
            >
              Registrar Empresa
            </button>
          </div>
        ) : (
          <section className={styles["empresas-form"]}>
            <h2 className={styles["empresas-title"]}>Registra tu Empresa</h2>
            <div className={styles["empresas-input-group"]}>
              <label className={styles["empresas-label"]} htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                className={styles["empresas-input"]}
                value={newEmpresaData.nombre}
                onChange={(e) => handleNewEmpresaChange("nombre", e.target.value)}
              />
            </div>
            <div className={styles["empresas-input-group"]}>
              <label className={styles["empresas-label"]} htmlFor="domicilio">
                Domicilio
              </label>
              <input
                id="domicilio"
                type="text"
                className={styles["empresas-input"]}
                value={newEmpresaData.domicilio}
                onChange={(e) => handleNewEmpresaChange("domicilio", e.target.value)}
              />
            </div>
            <div className={styles["empresas-input-group"]}>
              <label className={styles["empresas-label"]} htmlFor="nif">
                NIF / CIF
              </label>
              <input
                id="nif"
                type="text"
                className={styles["empresas-input"]}
                value={newEmpresaData.nif}
                onChange={(e) => handleNewEmpresaChange("nif", e.target.value)}
              />
            </div>
            <div className={styles["empresas-input-group"]}>
              <label className={styles["empresas-label"]} htmlFor="contactPhone">
                Teléfono de Contacto
              </label>
              <input
                id="contactPhone"
                type="tel"
                className={styles["empresas-input"]}
                value={newEmpresaData.contactPhone}
                onChange={(e) => handleNewEmpresaChange("contactPhone", e.target.value)}
              />
            </div>
            <div className={styles["empresas-btn-group"]}>
              <button onClick={handleCreateNewEmpresa} className={styles["empresas-btn-save"]}>
                Crear Empresa
              </button>
              <button
                onClick={() => setShowRegisterForm(false)}
                className={styles["empresas-btn-cancel"]}
              >
                Cancelar
              </button>
            </div>
          </section>
        )}
      </main>
    );
  }

  const getPlanLabel = (plan: PlanType | undefined) => {
    switch (plan) {
      case "BASICO":
        return "Básico";
      case "PREMIUM":
        return "Premium";
      default:
        return "Sin Plan";
    }
  };

  return (
    <main className={styles["empresas-container"]}>
      <h1 className={styles["empresas-title"]}>Mi Empresa</h1>
      <p className={styles["empresa-description"]}>
        Consulta la información sobre tu empresa.
      </p>

      {editMode ? (
        <section className={styles["empresas-form"]}>
          <div className={styles["empresas-input-group"]}>
            <label className={styles["empresas-label"]} htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              className={styles["empresas-input"]}
              value={formData.nombre || ""}
              onChange={(e) => handleChange("nombre", e.target.value)}
            />
          </div>
          <div className={styles["empresas-input-group"]}>
            <label className={styles["empresas-label"]} htmlFor="domicilio">
              Domicilio
            </label>
            <input
              id="domicilio"
              type="text"
              className={styles["empresas-input"]}
              value={formData.domicilio || ""}
              onChange={(e) => handleChange("domicilio", e.target.value)}
            />
          </div>
          <div className={styles["empresas-input-group"]}>
            <label className={styles["empresas-label"]} htmlFor="nif">
              NIF / CIF
            </label>
            <input
              id="nif"
              type="text"
              className={styles["empresas-input"]}
              value={formData.nif || ""}
              onChange={(e) => handleChange("nif", e.target.value)}
            />
          </div>
          <div className={styles["empresas-input-group"]}>
            <label className={styles["empresas-label"]} htmlFor="contactPhone">
              Teléfono de Contacto
            </label>
            <input
              id="contactPhone"
              type="tel"
              className={styles["empresas-input"]}
              value={formData.contactPhone || ""}
              onChange={(e) => handleChange("contactPhone", e.target.value)}
            />
          </div>
          <div className={styles["empresas-btn-group"]}>
            <button onClick={handleSave} className={styles["empresas-btn-save"]}>
              Guardar
            </button>
            <button
              onClick={() => setEditMode(false)}
              className={styles["empresas-btn-cancel"]}
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <section className={styles["empresas-info-container"]}>
          <div className={styles["table-responsive"]}>
            <table className={styles["empresas-table"]}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Domicilio</th>
                  <th>NIF</th>
                  <th>Teléfono</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{empresa.nombre}</td>
                  <td>{empresa.domicilio || "N/A"}</td>
                  <td>{empresa.nif || "N/A"}</td>
                  <td>{empresa.contactPhone || "N/A"}</td>
                  <td>{getPlanLabel(empresa.plan)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={styles["empresas-btn-edit-container"]}>
            <button onClick={handleEdit} className={styles["empresas-btn-edit"]}>
              Editar Información
            </button>
          </div>
        </section>
      )}

      {empresa.subscriptionData && (
        <div className={styles["subscription-info"]}>
          <h2>Información de Suscripción</h2>
          <p>
            <strong>Fecha de Renovación:</strong>{" "}
            {empresa.subscriptionData.renewalDate
              ? new Date(empresa.subscriptionData.renewalDate).toLocaleDateString()
              : "N/A"}
          </p>
          <p>
            <strong>Fecha de Expiración:</strong>{" "}
            {empresa.subscriptionData.expiryDate
              ? new Date(empresa.subscriptionData.expiryDate).toLocaleDateString()
              : "N/A"}
          </p>
          <p>
            <strong>Estado:</strong> {empresa.subscriptionData.status || "N/A"}
          </p>

          <div className={styles["empresas-subscription-container"]}>
            <button
              className={styles["empresas-btn-cancel-subscription"]}
              onClick={handleCancelSubscription}
            >
              Cancelar Suscripción
            </button>
          </div>
        </div>
      )}

      <div className={styles["empresas-delete-container"]}>
        <button
          className={styles["empresas-btn-delete-account"]}
          onClick={handleDeleteAccount}
        >
          Eliminar Cuenta y Datos
        </button>
      </div>

      {modalData && modalData.isOpen && (
        <CustomModal
          isOpen={modalData.isOpen}
          title={modalData.title}
          message={modalData.message}
          type={modalData.type}
          onConfirm={modalData.onConfirm}
          onCancel={modalData.onCancel}
        />
      )}
    </main>
  );
}
