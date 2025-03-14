"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
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

// Interfaz para el resumen de ajuste de obras en la empresa
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

  // Guardamos los datos de la empresa, que incluyen lastAdjustmentObrasInfo
  const [empresaData, setEmpresaData] = useState<any>(null);

  useEffect(() => {
    async function fetchEmpresaIdAndSubscribe() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 1) Obtenemos la empresa del usuario
      const usersRef = collection(db, "Users");
      const qUsers = query(usersRef, where("uid", "==", currentUser.uid));
      const usersSnap = await getDocs(qUsers);

      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0].data();
        const miEmpresaId = userDoc.empresaId as string;
        setEmpresaId(miEmpresaId);

        // 2) Suscripción en tiempo real al documento de la empresa
        const empresaRef = doc(db, "Empresas", miEmpresaId);
        const unsubEmpresa = onSnapshot(empresaRef, (docSnap) => {
          if (docSnap.exists()) {
            setEmpresaData(docSnap.data());
          }
        });

        // 3) Suscripción en tiempo real a la colección "Obras"
        const obrasRef = collection(db, "Obras");
        const qObras = query(obrasRef, where("empresaId", "==", miEmpresaId));
        const unsubObras = onSnapshot(qObras, (snapshot) => {
          const temp: Obra[] = [];
          snapshot.forEach((docu) => {
            temp.push({ id: docu.id, ...docu.data() } as Obra);
          });
          setObras(temp);
        });

        setLoading(false);

        // Cleanup: Cancelamos las suscripciones al desmontar
        return () => {
          unsubEmpresa();
          unsubObras();
        };
      }

      setLoading(false);
    }

    fetchEmpresaIdAndSubscribe();
  }, []);

  // Crear una nueva obra
  async function handleCreate() {
    if (!empresaId || !newObra.nombre) return;

    await addDoc(collection(db, "Obras"), {
      empresaId,
      nombre: newObra.nombre,
      totalHoras: 0,
      active: true,
      // No añadimos createdAt; las Cloud Functions lo gestionan con Timestamp.now()
    });

    // Reseteamos el formulario; la suscripción en tiempo real actualiza la lista
    setNewObra({ nombre: "" });
  }

  // Actualizar una obra (solo el nombre)
  async function handleUpdate() {
    if (!editingObra?.id || !empresaId) return;
    const ref = doc(db, "Obras", editingObra.id);

    await updateDoc(ref, {
      nombre: editingObra.nombre,
    });

    setEditMode(false);
    setEditingObra(null);
    // La suscripción se encarga de actualizar la lista en tiempo real
  }

  // Eliminar una obra
  async function handleDelete(id: string | undefined) {
    if (!id || !empresaId) return;
    await deleteDoc(doc(db, "Obras", id));
    // La suscripción en tiempo real actualiza la lista automáticamente
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

  const lastObrasAdj = empresaData?.lastAdjustmentInfoObras as LastAdjustmentObrasInfo | undefined;

  return (
    <main className={styles["obras-container"]}>
      <h1 className={styles["obras-title"]}>Obras</h1>

      {/* Aviso con la info del ajuste */}
      {lastObrasAdj && (
        <div className={styles["ajuste-banner"]}>
          <p><strong>Ajuste de Obras</strong></p>
          {lastObrasAdj.message && <p>{lastObrasAdj.message}</p>}
          <p>Plan actual: {lastObrasAdj.plan}</p>
          <p>
            Inactivadas <strong className={styles["text-red"]}>{lastObrasAdj.inactivated}</strong> de un total de{" "}
            <strong className={styles["text-green"]}>{lastObrasAdj.total}</strong> obras.
          </p>
          <p>Fecha: {new Date(lastObrasAdj.timestamp).toLocaleString()}</p>
        </div>
      )}


      <p className={styles["obras-description"]}>
        Agrega tus obras activas, para que los empleados puedan visualizarlas desde el bot de fichajes.
      </p>

      {/* Formulario de creación o edición */}
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
