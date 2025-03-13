// src/admin/obras/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import styles from "../../styles/ObrasPage.module.css";

interface Obra {
  id?: string;
  empresaId: string;
  nombre: string;
  totalHoras?: number;
  active?: boolean;
  createdAt?: any;
}

// Interfaz opcional para el resumen de ajuste en la empresa (obras)
interface LastAdjustmentObrasInfo {
  message?: string;
  inactivated: number;
  total: number;
  plan: string;
  timestamp: string;
}

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [newObra, setNewObra] = useState<Partial<Obra>>({ nombre: "" });
  const [editMode, setEditMode] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Guardamos también la data de la empresa para mostrar avisos
  const [empresaData, setEmpresaData] = useState<any>(null);

  useEffect(() => {
    async function fetchEmpresaIdYObras() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 1) Buscamos la empresa del usuario
      const usersRef = collection(db, "Users");
      const qUsers = query(usersRef, where("uid", "==", currentUser.uid));
      const usersSnap = await getDocs(qUsers);

      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0].data();
        const miEmpresaId = userDoc.empresaId as string;
        setEmpresaId(miEmpresaId);

        // 2) Cargamos el doc de la empresa para leer lastAdjustmentObrasInfo
        const empresaDocRef = doc(db, "Empresas", miEmpresaId);
        const empresaSnap = await getDoc(empresaDocRef);
        if (empresaSnap.exists()) {
          setEmpresaData(empresaSnap.data());
        }

        // 3) Cargamos las obras
        await fetchObras(miEmpresaId);
      }
      setLoading(false);
    }
    fetchEmpresaIdYObras();
  }, []);

  // Carga las obras filtradas por empresa
  async function fetchObras(miEmpresaId: string) {
    const obrasRef = collection(db, "Obras");
    const qObras = query(obrasRef, where("empresaId", "==", miEmpresaId));
    const snap = await getDocs(qObras);

    const temp: Obra[] = [];
    snap.forEach((docu) => {
      temp.push({ id: docu.id, ...docu.data() } as Obra);
    });
    setObras(temp);
  }

  // Crear una nueva obra
  async function handleCreate() {
    if (!empresaId || !newObra.nombre) return;

    await addDoc(collection(db, "Obras"), {
      empresaId,
      nombre: newObra.nombre,
      totalHoras: 0,
      active: true, // por si tus funciones usan 'active' en su lógica
      createdAt: serverTimestamp(),
    });

    // Recargamos obras y la data de la empresa para refrescar avisos
    await fetchObras(empresaId);
    const empresaSnap = await getDoc(doc(db, "Empresas", empresaId));
    if (empresaSnap.exists()) {
      setEmpresaData(empresaSnap.data());
    }

    setNewObra({ nombre: "" });
  }

  // Actualizar una obra (solo el nombre en este caso)
  async function handleUpdate() {
    if (!editingObra?.id || !empresaId) return;
    const ref = doc(db, "Obras", editingObra.id);

    await updateDoc(ref, {
      nombre: editingObra.nombre,
    });

    setEditMode(false);
    setEditingObra(null);

    // Recargamos
    await fetchObras(empresaId);
    const empresaSnap = await getDoc(doc(db, "Empresas", empresaId));
    if (empresaSnap.exists()) {
      setEmpresaData(empresaSnap.data());
    }
  }

  // Eliminar una obra
  async function handleDelete(id: string | undefined) {
    if (!id || !empresaId) return;
    await deleteDoc(doc(db, "Obras", id));

    // Recargamos
    await fetchObras(empresaId);
    const empresaSnap = await getDoc(doc(db, "Empresas", empresaId));
    if (empresaSnap.exists()) {
      setEmpresaData(empresaSnap.data());
    }
  }

  if (loading) {
    return <p className={styles["obras-loading"]}>Cargando obras...</p>;
  }
  if (!empresaId) {
    return (
      <p className={styles["obras-loading"]}>
        No se encontró la empresa asociada a este usuario.
      </p>
    );
  }

  // Obtenemos la info de ajuste de obras
  const lastObrasAdj = empresaData?.lastAdjustmentObrasInfo as LastAdjustmentObrasInfo | undefined;

  return (
    <main className={styles["obras-container"]}>
      <h1 className={styles["obras-title"]}>Obras</h1>

      {/* Aviso si existe lastAdjustmentObrasInfo */}
      {lastObrasAdj && (
        <div className={styles["ajuste-banner"]}>
          <p><strong>Ajuste de Obras</strong></p>
          {lastObrasAdj.message && <p>{lastObrasAdj.message}</p>}
          <p>Plan actual: {lastObrasAdj.plan}</p>
          <p>
            Inactivadas <strong>{lastObrasAdj.inactivated}</strong> de un total
            de <strong>{lastObrasAdj.total}</strong> obras.
          </p>
          <p>Fecha: {new Date(lastObrasAdj.timestamp).toLocaleString()}</p>
        </div>
      )}

      <p className={styles["obras-description"]}>
        Agrega tus obras activas, para que los empleados puedan visualizarlas,
        desde el bot de fichajes.
      </p>

      {!editMode ? (
        <section className={styles["obras-form"]}>
          <input
            type="text"
            placeholder="Nombre de la obra"
            className={styles["obras-input"]}
            value={newObra.nombre || ""}
            onChange={(e) => setNewObra({ nombre: e.target.value })}
          />
          <button onClick={handleCreate} className={styles["obras-btn-create"]}>
            Crear
          </button>
        </section>
      ) : (
        <section className={styles["obras-form"]}>
          <input
            type="text"
            placeholder="Nombre de la obra"
            className={styles["obras-input"]}
            value={editingObra?.nombre || ""}
            onChange={(e) =>
              setEditingObra({ ...editingObra!, nombre: e.target.value })
            }
          />
          <button onClick={handleUpdate} className={styles["obras-btn-save"]}>
            Guardar
          </button>
          <button
            onClick={() => {
              setEditMode(false);
              setEditingObra(null);
            }}
            className={styles["obras-btn-cancel"]}
          >
            Cancelar
          </button>
        </section>
      )}

      <div className={styles["table-responsive"]}>
        <table className={styles["obras-table"]}>
          <thead>
            <tr className={styles["obras-table-head-row"]}>
              <th className={styles["obras-table-head"]}>Nombre</th>
              <th className={styles["obras-table-head"]}>Total Horas</th>
              <th className={styles["obras-table-head"]}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {obras.map((obra) => (
              <tr
                key={obra.id}
                className={
                  obra.active === false
                    ? styles["obras-row-inactive"]
                    : styles["obras-table-row"]
                }
              >
                <td className={styles["obras-table-cell"]}>{obra.nombre}</td>
                <td className={styles["obras-table-cell"]}>
                  {obra.totalHoras || 0}
                </td>
                <td className={styles["obras-table-cell"]}>
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setEditingObra(obra);
                    }}
                    className={styles["obras-btn-edit"]}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(obra.id)}
                    className={styles["obras-btn-delete"]}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
