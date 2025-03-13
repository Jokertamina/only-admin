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
import styles from "../../styles/FichajesPage.module.css"; // Usamos el CSS Module

interface Fichaje {
  id: string;
  empresaId: string;
  empleadoId: string;
  type?: string; // "jornada" o "obra"
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
  type?: string;
  obra: string;
  startTime: string;
  endTime: string | null;
  duracion?: number | null;
  fullName: string;
}

interface JornadaGroup {
  jornada: FichajeWithEmpleado;
  obras: FichajeWithEmpleado[];
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
      // Buscamos la empresa del usuario
      const usersRef = collection(db, "Users");
      const qUsers = query(usersRef, where("uid", "==", currentUser.uid));
      const usersSnap = await getDocs(qUsers);
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0].data();
        const miEmpresaId = userDoc.empresaId as string;
        setEmpresaId(miEmpresaId);

        // Escuchamos los fichajes de la empresa
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
              type: data.type,
              // Para fichajes de jornada mostramos "Jornada laboral"
              obra: data.type === "jornada" ? "Jornada laboral" : data.obra,
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

  // Agrupamos los fichajes por empleado
  const groupedByEmployee = sortedFichajes.reduce((acc, fichaje) => {
    if (!acc[fichaje.fullName]) {
      acc[fichaje.fullName] = [];
    }
    acc[fichaje.fullName].push(fichaje);
    return acc;
  }, {} as Record<string, FichajeWithEmpleado[]>);

  // Dentro de cada empleado, agrupamos los eventos en jornadas y asociamos las obras
  function groupEventsByJornada(events: FichajeWithEmpleado[]): JornadaGroup[] {
    const groups: JornadaGroup[] = [];
    let currentGroup: JornadaGroup | null = null;
    events.forEach((event) => {
      if (event.type === "jornada") {
        // Inicia una nueva jornada
        currentGroup = { jornada: event, obras: [] };
        groups.push(currentGroup);
      } else if (event.type === "obra") {
        if (currentGroup) {
          // Asociamos la obra a la jornada si ocurre entre la entrada y (si existe) la salida
          if (
            !currentGroup.jornada.endTime ||
            new Date(event.startTime) <= new Date(currentGroup.jornada.endTime)
          ) {
            currentGroup.obras.push(event);
          }
        }
      }
    });
    return groups;
  }

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

  // Arreglo para exportar (formato plano)
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

      {/* Agrupamos y mostramos por empleado */}
      {Object.entries(groupedByEmployee).map(([employee, events]) => {
        const sortedEvents = events.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        const jornadas = groupEventsByJornada(sortedEvents);
        return (
          <div key={employee} className={styles["employee-group"]}>
            <h2>{employee}</h2>
            {jornadas.length > 0 ? (
              jornadas.map((group, idx) => (
                <div key={idx} className={styles["jornada-card"]}>
                  <div className={styles["jornada-header"]}>
                    <p>
                      <strong>Jornada Laboral</strong>
                    </p>
                    <p>
                      <strong>Entrada:</strong>{" "}
                      {new Date(group.jornada.startTime).toLocaleString()}
                    </p>
                    <p>
                      <strong>Salida:</strong>{" "}
                      {group.jornada.endTime
                        ? new Date(group.jornada.endTime).toLocaleString()
                        : "—"}
                    </p>
                    <p>
                      <strong>Duración:</strong>{" "}
                      {group.jornada.duracion
                        ? group.jornada.duracion.toFixed(2)
                        : "—"}{" "}
                      hrs
                    </p>
                  </div>
                  {group.obras.length > 0 && (
                    <div className={styles["table-responsive"]}>
                    <table className={styles["obra-table"]}>
                      <thead>
                        <tr>
                          <th>Obra</th>
                          <th>Entrada</th>
                          <th>Salida</th>
                          <th>Duración (hrs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.obras.map((obraEvent) => (
                          <tr key={obraEvent.id}>
                            <td>{obraEvent.obra}</td>
                            <td>
                              {new Date(obraEvent.startTime).toLocaleString()}
                            </td>
                            <td>
                              {obraEvent.endTime
                                ? new Date(obraEvent.endTime).toLocaleString()
                                : "—"}
                            </td>
                            <td>
                              {obraEvent.duracion
                                ? obraEvent.duracion.toFixed(2)
                                : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No hay fichajes de jornada para este empleado.</p>
            )}
          </div>
        );
      })}
    </main>
  );
}
