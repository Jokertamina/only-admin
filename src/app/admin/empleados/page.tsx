"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  DocumentData,
  Timestamp
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebaseConfig";
import styles from "../../styles/EmpleadosPage.module.css";

interface Empleado {
  id?: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  empresaId: string;
  active?: boolean;
  createdAt?: Timestamp; // Usamos Timestamp en lugar de any
}

interface LastAdjustmentInfo {
  inactivated: number;
  total: number;
  plan: string;
  timestamp: string;
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [newEmpleado, setNewEmpleado] = useState<Partial<Empleado>>({
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cambiamos any a DocumentData | null para evitar no-explicit-any
  const [empresaData, setEmpresaData] = useState<DocumentData | null>(null);

  useEffect(() => {
    async function fetchEmpresaIdAndSubscribe() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 1) Obtenemos la empresaId del usuario actual
      const usersRef = collection(db, "Users");
      const qUser = query(usersRef, where("uid", "==", currentUser.uid));
      const usersSnap = await getDocs(qUser);

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

        // 3) Suscripción en tiempo real a los empleados de la empresa
        const empRef = collection(db, "Empleados");
        const qEmp = query(empRef, where("empresaId", "==", miEmpresaId));
        const unsubEmpleados = onSnapshot(qEmp, (snap) => {
          const temp: Empleado[] = [];
          snap.forEach((docu) => {
            temp.push({ id: docu.id, ...docu.data() } as Empleado);
          });
          setEmpleados(temp);
        });

        setLoading(false);

        // Limpiamos las suscripciones al desmontar el componente
        return () => {
          unsubEmpresa();
          unsubEmpleados();
        };
      }

      setLoading(false);
    }

    fetchEmpresaIdAndSubscribe();
  }, []);

  // Crea un nuevo empleado
  async function handleCreate() {
    if (!empresaId) return;
    if (
      !newEmpleado.nombre ||
      !newEmpleado.primerApellido ||
      !newEmpleado.segundoApellido
    ) {
      return;
    }

    await addDoc(collection(db, "Empleados"), {
      nombre: newEmpleado.nombre.trim().toLowerCase(),
      primerApellido: newEmpleado.primerApellido.trim().toLowerCase(),
      segundoApellido: newEmpleado.segundoApellido.trim().toLowerCase(),
      empresaId,
      active: true,
      // No añadimos createdAt, lo gestionan las Cloud Functions con Timestamp.now()
    });

    // Reseteamos el formulario
    setNewEmpleado({ nombre: "", primerApellido: "", segundoApellido: "" });
  }

  // Actualiza un empleado
  async function handleUpdate() {
    if (!editingEmpleado?.id || !empresaId) return;
    const ref = doc(db, "Empleados", editingEmpleado.id);

    await updateDoc(ref, {
      nombre: editingEmpleado.nombre.trim().toLowerCase(),
      primerApellido: editingEmpleado.primerApellido.trim().toLowerCase(),
      segundoApellido: editingEmpleado.segundoApellido.trim().toLowerCase(),
    });

    setEditMode(false);
    setEditingEmpleado(null);
  }

  // Elimina un empleado
  async function handleDelete(id: string | undefined) {
    if (!id || !empresaId) return;
    const ref = doc(db, "Empleados", id);
    await deleteDoc(ref);
  }

  if (loading) {
    return <p className={styles["empleados-loading"]}>Cargando empleados...</p>;
  }

  if (!empresaId) {
    return (
      <p className={styles["empleados-loading"]}>
        No se encontró la empresa asociada a este usuario.
      </p>
    );
  }

  const lastAdj = empresaData?.lastAdjustmentInfo as LastAdjustmentInfo | undefined;

  return (
    <main className={styles["empleados-container"]}>
      <h1 className={styles["empleados-title"]}>Empleados</h1>

      {/* Banner con la info del ajuste */}
      {lastAdj && (
        <div className={styles["ajuste-banner"]}>
          <p><strong>Ajuste de Empleados</strong></p>
          <p>Plan actual: {lastAdj.plan}</p>
          <p>
            Se han inactivado{" "}
            <strong className={styles["text-red"]}>{lastAdj.inactivated}</strong>{" "}
            empleados de un total de{" "}
            <strong className={styles["text-green"]}>{lastAdj.total}</strong>.
          </p>
          <p>Fecha: {new Date(lastAdj.timestamp).toLocaleString()}</p>
        </div>
      )}

      <p className={styles["empleados-description"]}>
        Registra tus empleados, para que el bot los reconozca a la hora de fichar.
      </p>

      {/* Formulario de creación o edición */}
      {!editMode ? (
        <div className={styles["empleados-form"]}>
          <div className={styles["empleados-input-group"]}>
            <input
              type="text"
              placeholder="Nombre"
              className={styles["empleados-input"]}
              value={newEmpleado.nombre || ""}
              onChange={(e) =>
                setNewEmpleado({ ...newEmpleado, nombre: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Primer Apellido"
              className={styles["empleados-input"]}
              value={newEmpleado.primerApellido || ""}
              onChange={(e) =>
                setNewEmpleado({
                  ...newEmpleado,
                  primerApellido: e.target.value,
                })
              }
            />
            <input
              type="text"
              placeholder="Segundo Apellido"
              className={styles["empleados-input"]}
              value={newEmpleado.segundoApellido || ""}
              onChange={(e) =>
                setNewEmpleado({
                  ...newEmpleado,
                  segundoApellido: e.target.value,
                })
              }
            />
          </div>
          <button
            onClick={handleCreate}
            className={styles["empleados-btn-create"]}
          >
            Crear
          </button>
        </div>
      ) : (
        <div className={styles["empleados-form"]}>
          <div className={styles["empleados-input-group"]}>
            <input
              type="text"
              placeholder="Nombre"
              className={styles["empleados-input"]}
              value={editingEmpleado?.nombre || ""}
              onChange={(e) =>
                setEditingEmpleado({
                  ...editingEmpleado!,
                  nombre: e.target.value,
                })
              }
            />
            <input
              type="text"
              placeholder="Primer Apellido"
              className={styles["empleados-input"]}
              value={editingEmpleado?.primerApellido || ""}
              onChange={(e) =>
                setEditingEmpleado({
                  ...editingEmpleado!,
                  primerApellido: e.target.value,
                })
              }
            />
            <input
              type="text"
              placeholder="Segundo Apellido"
              className={styles["empleados-input"]}
              value={editingEmpleado?.segundoApellido || ""}
              onChange={(e) =>
                setEditingEmpleado({
                  ...editingEmpleado!,
                  segundoApellido: e.target.value,
                })
              }
            />
          </div>
          <div className={styles["empleados-btn-group"]}>
            <button
              onClick={handleUpdate}
              className={styles["empleados-btn-save"]}
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setEditingEmpleado(null);
              }}
              className={styles["empleados-btn-cancel"]}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de empleados */}
      <div className={styles["table-responsive"]}>
        <table className={styles["empleados-table"]}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Primer Apellido</th>
              <th>Segundo Apellido</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp) => (
              <tr
                key={emp.id}
                className={
                  emp.active === false
                    ? styles["empleados-row-inactive"]
                    : styles["empleados-row"]
                }
              >
                <td>{emp.nombre}</td>
                <td>{emp.primerApellido}</td>
                <td>{emp.segundoApellido}</td>
                <td className={styles["empleados-actions"]}>
                  <button
                    onClick={() => {
                      if (emp.active === false) {
                        alert(
                          "Este empleado está inactivo. Ajusta tu plan para editarlo."
                        );
                        return;
                      }
                      setEditMode(true);
                      setEditingEmpleado(emp);
                    }}
                    className={styles["empleados-btn-edit"]}
                    disabled={emp.active === false}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className={styles["empleados-btn-delete"]}
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
