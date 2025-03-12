// src/admin/empleados/page.tsx

"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import styles from "../../styles/EmpleadosPage.module.css"; // Importamos como módulo

interface Empleado {
  id?: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  empresaId: string;
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

  useEffect(() => {
    async function fetchEmpresaIdYEmpleados() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("uid", "==", currentUser.uid));
      const usersSnap = await getDocs(q);
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0].data();
        const miEmpresaId = userDoc.empresaId as string;
        setEmpresaId(miEmpresaId);
        await fetchEmpleados(miEmpresaId);
      }
      setLoading(false);
    }
    fetchEmpresaIdYEmpleados();
  }, []);

  async function fetchEmpleados(miEmpresaId: string) {
    const empRef = collection(db, "Empleados");
    const qEmp = query(empRef, where("empresaId", "==", miEmpresaId));
    const snap = await getDocs(qEmp);
    const temp: Empleado[] = [];
    snap.forEach((docu) => {
      temp.push({ id: docu.id, ...docu.data() } as Empleado);
    });
    setEmpleados(temp);
  }

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
      nombre: newEmpleado.nombre,
      primerApellido: newEmpleado.primerApellido,
      segundoApellido: newEmpleado.segundoApellido,
      empresaId,
    });
    setNewEmpleado({ nombre: "", primerApellido: "", segundoApellido: "" });
    fetchEmpleados(empresaId);
  }

  async function handleUpdate() {
    if (!editingEmpleado?.id || !empresaId) return;
    const ref = doc(db, "Empleados", editingEmpleado.id);
    await updateDoc(ref, {
      nombre: editingEmpleado.nombre,
      primerApellido: editingEmpleado.primerApellido,
      segundoApellido: editingEmpleado.segundoApellido,
    });
    setEditMode(false);
    setEditingEmpleado(null);
    fetchEmpleados(empresaId);
  }

  async function handleDelete(id: string | undefined) {
    if (!id || !empresaId) return;
    const ref = doc(db, "Empleados", id);
    await deleteDoc(ref);
    fetchEmpleados(empresaId);
  }

  if (loading) {
    return <p className={styles["empleados-loading"]}>Cargando empleados...</p>;
  }
  if (!empresaId) {
    return <p className={styles["empleados-loading"]}>No se encontró la empresa asociada a este usuario.</p>;
  }

  return (
    <main className={styles["empleados-container"]}>
      <h1 className={styles["empleados-title"]}>Empleados</h1>

      {/* Formulario para creación o edición */}
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
          <button onClick={handleCreate} className={styles["empleados-btn-create"]}>
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
            <button onClick={handleUpdate} className={styles["empleados-btn-save"]}>
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

      {/* Listado de empleados */}
      <div className={styles["table-responsive"]}>
        <table className={styles["empleados-table"]}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Primer Apellido</th>
              <th>Segundo Apellido</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp) => (
              <tr key={emp.id} className={styles["empleados-row"]}>
                <td>{emp.id}</td>
                <td>{emp.nombre}</td>
                <td>{emp.primerApellido}</td>
                <td>{emp.segundoApellido}</td>
                <td className={styles["empleados-actions"]}>
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setEditingEmpleado(emp);
                    }}
                    className={styles["empleados-btn-edit"]}
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
