// src/admin/fichajes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import ExportButtons from "../../components/ExportButtons";
import styles from "../../styles/FichajesPage.module.css"; // Importamos el CSS Module

interface Fichaje {
  id: string;
  empresaId: string;
  empleadoId: string;
  obra: string;
  startTime: string;
  endTime: string | null;
  duracion?: number | null;
}

interface Empleado {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
}

interface FichajeWithEmpleado {
  id: string;
  empresaId: string;
  obra: string;
  startTime: string;
  endTime: string | null;
  duracion?: number | null;
  fullName: string;
}

export default function FichajesPage() {
  const [fichajes, setFichajes] = useState<FichajeWithEmpleado[]>([]);
  const [sortBy, setSortBy] = useState("fechaAsc");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      // Buscamos la empresa
      const usersRef = collection(db, "Users");
      const qUsers = query(usersRef, where("uid", "==", currentUser.uid));
      const usersSnap = await getDocs(qUsers);
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0].data();
        const miEmpresaId = userDoc.empresaId as string;
        setEmpresaId(miEmpresaId);

        // Escuchamos los fichajes de esa empresa
        const fichajesRef = collection(db, "Fichajes");
        const qFichajes = query(fichajesRef, where("empresaId", "==", miEmpresaId));

        const unsubscribe = onSnapshot(qFichajes, async (snapshot) => {
          const temp: FichajeWithEmpleado[] = [];
          const tasks = snapshot.docs.map(async (docu) => {
            const data = docu.data() as Omit<Fichaje, "id">;
            const fichajeId = docu.id;
            let fullName = "N/A";
            if (data.empleadoId) {
              const empRef = doc(db, "Empleados", data.empleadoId);
              const empSnap = await getDoc(empRef);
              if (empSnap.exists()) {
                const empData = empSnap.data() as Empleado;
                fullName = `${empData.nombre} ${empData.primerApellido} ${empData.segundoApellido}`.trim();
              }
            }
            temp.push({
              id: fichajeId,
              empresaId: data.empresaId,
              obra: data.obra,
              startTime: data.startTime,
              endTime: data.endTime || null,
              duracion: data.duracion ?? null,
              fullName,
            });
          });
          await Promise.all(tasks);
          setFichajes(temp);
          setLoading(false);
        });

        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function getSortedFichajes() {
    const sorted = [...fichajes];
    switch (sortBy) {
      case "fechaAsc":
        sorted.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        break;
      case "fechaDesc":
        sorted.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        break;
      default:
        sorted.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
    }
    return sorted;
  }

  const sortedFichajes = getSortedFichajes();

  if (loading) {
    return <p className={styles["fichajes-loading"]}>Cargando fichajes...</p>;
  }
  if (!empresaId) {
    return (
      <p className={styles["fichajes-loading"]}>
        No se encontró la empresa asociada a este usuario.
      </p>
    );
  }

  // Arreglo para exportar
  const fichajesForExport = sortedFichajes.map((f) => ({
    id: f.id,
    empresaId: f.empresaId,
    fullName: f.fullName,
    obra: f.obra,
    startTime: f.startTime,
    endTime: f.endTime,
    duracion: f.duracion,
  }));

  return (
    <main className={styles["fichajes-container"]}>
      <h1 className={styles["fichajes-title"]}>Fichajes (Tiempo Real)</h1>
      <div className={styles["fichajes-sort"]}>
        <label htmlFor="sortSelect" className={styles["fichajes-sort-label"]}>
          Ordenar por:
        </label>
        <select
          id="sortSelect"
          className={styles["fichajes-select"]}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="fechaAsc">Entrada Ascendente</option>
          <option value="fechaDesc">Entrada Descendente</option>
        </select>
      </div>

      <ExportButtons fichajes={fichajesForExport} />

      <div className={styles["table-responsive"]}>
        <table className={styles["fichajes-table"]}>
          <thead>
            <tr className={styles["fichajes-table-head-row"]}>
              <th className={styles["fichajes-table-head"]}>ID</th>
              <th className={styles["fichajes-table-head"]}>Empleado</th>
              <th className={styles["fichajes-table-head"]}>Obra</th>
              <th className={styles["fichajes-table-head"]}>Entrada</th>
              <th className={styles["fichajes-table-head"]}>Salida</th>
              <th className={styles["fichajes-table-head"]}>Duración (hrs)</th>
            </tr>
          </thead>
          <tbody>
            {sortedFichajes.map((f) => (
              <tr key={f.id} className={styles["fichajes-table-row"]}>
                <td className={styles["fichajes-table-cell"]}>{f.id}</td>
                <td className={styles["fichajes-table-cell"]}>{f.fullName}</td>
                <td className={styles["fichajes-table-cell"]}>{f.obra}</td>
                <td className={styles["fichajes-table-cell"]}>
                  {new Date(f.startTime).toLocaleString()}
                </td>
                <td className={styles["fichajes-table-cell"]}>
                  {f.endTime ? new Date(f.endTime).toLocaleString() : "—"}
                </td>
                <td className={styles["fichajes-table-cell"]}>
                  {f.duracion ? f.duracion.toFixed(2) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
