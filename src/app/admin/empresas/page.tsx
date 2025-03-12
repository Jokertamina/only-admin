// src/admin/empresas/page.tsx

"use client"; // Indica que este componente usa hooks en Next.js 13

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebaseConfig";
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
import styles from "../../styles/EmpresasPage.module.css"; // Importa el CSS Module

// Definimos un tipo para el plan
type PlanType = "SIN_PLAN" | "BASICO" | "PREMIUM";

interface Empresa {
  id: string;
  nombre: string;
  domicilio?: string;
  nif?: string;
  contactPhone?: string | null;
  plan?: PlanType;
}

export default function EmpresasPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Datos editables (para edición)
  const [formData, setFormData] = useState<Partial<Empresa>>({});

  // Para registrar nueva empresa
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newEmpresaData, setNewEmpresaData] = useState({
    nombre: "",
    domicilio: "",
    nif: "",
    contactPhone: "",
  });

  // Referencia al doc de "Users"
  const [userDocId, setUserDocId] = useState<string | null>(null);

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

  // EDITAR EMPRESA
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

  // REGISTRAR NUEVA EMPRESA
  const handleNewEmpresaChange = (field: keyof typeof newEmpresaData, value: string) => {
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

  // RENDER
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
              <button onClick={() => setShowRegisterForm(false)} className={styles["empresas-btn-cancel"]}>
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
            <button onClick={() => setEditMode(false)} className={styles["empresas-btn-cancel"]}>
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
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Domicilio</th>
                  <th>NIF</th>
                  <th>Teléfono</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{empresa.id}</td>
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
    </main>
  );
}
