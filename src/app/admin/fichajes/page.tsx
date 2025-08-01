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
import styles from "../../styles/FichajesPage.module.css";

// 1. Extendemos la interfaz para incluir locationStart / locationEnd
interface LocationData {
  latitude: number;
  longitude: number;
}

interface Fichaje {
  id: string;
  empresaId: string;
  empleadoId: string;
  type?: string; // "jornada" o "obra"
  obra?: string; // en jornada no existe, en obra sí
  startTime: string;
  endTime: string | null;
  duracion?: number | null;
  locationStart?: LocationData | null;
  locationEnd?: LocationData | null;
}

interface Empleado {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
}

interface FichajeWithEmpleado extends Fichaje {
  fullName: string;
}

// Agrupación
interface JornadaGroup {
  jornada: FichajeWithEmpleado;
  obras: FichajeWithEmpleado[];
}

export default function FichajesPage() {
  const [fichajes, setFichajes] = useState<FichajeWithEmpleado[]>([]);
  const [sortBy, setSortBy] = useState("fechaAsc");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para filtros de exportación
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterObra, setFilterObra] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  useEffect(() => {
    async function fetchData() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 2. Buscamos la empresa del usuario
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

            // 3. Construimos el Fichaje con la location (si existe)
            const fichajeWithEmpleado: FichajeWithEmpleado = {
              id: fichajeId,
              empresaId: data.empresaId,
              empleadoId: data.empleadoId,
              type: data.type,
              obra: data.type === "jornada" ? "Jornada laboral" : data.obra,
              startTime: data.startTime,
              endTime: data.endTime || null,
              duracion: data.duracion ?? null,
              locationStart: data.locationStart || null,
              locationEnd: data.locationEnd || null,
              fullName,
            };

            temp.push(fichajeWithEmpleado);
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
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        break;
      case "fechaDesc":
        sorted.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        break;
      default:
        sorted.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
    }
    return sorted;
  }

  const sortedFichajes = getSortedFichajes();

  // Filtrado para exportación
  const filteredFichajes = sortedFichajes.filter((f) => {
    if (filterEmployee && !f.fullName.toLowerCase().includes(filterEmployee.toLowerCase())) {
      return false;
    }
    if (filterObra && (!f.obra || !f.obra.toLowerCase().includes(filterObra.toLowerCase()))) {
      return false;
    }
    if (filterStartDate) {
      if (new Date(f.startTime) < new Date(filterStartDate)) return false;
    }
    if (filterEndDate) {
      if (new Date(f.startTime) > new Date(filterEndDate)) return false;
    }
    return true;
  });

  // Validaciones de filtros
  const filterErrors: string[] = [];
  const now = new Date();
  if (filterStartDate) {
    const startDate = new Date(filterStartDate);
    if (startDate > now) {
      filterErrors.push("La fecha de inicio no puede ser mayor que la fecha actual.");
    }
  }
  if (filterEndDate) {
    const endDate = new Date(filterEndDate);
    if (endDate > now) {
      filterErrors.push("La fecha final no puede ser mayor que la fecha actual.");
    }
  }
  if (filterStartDate && filterEndDate) {
    const startDate = new Date(filterStartDate);
    const endDate = new Date(filterEndDate);
    if (startDate > endDate) {
      filterErrors.push("La fecha de inicio no puede ser mayor que la fecha final.");
    }
  }
  if (
    filteredFichajes.length === 0 &&
    (filterEmployee || filterObra || filterStartDate || filterEndDate)
  ) {
    filterErrors.push("No se han encontrado fichajes que cumplan con los criterios seleccionados.");
  }

  // 5. Datos para exportar (plano) usando el filtrado aplicado
  // Aquí se han eliminado las columnas 'id' y 'empresaId'
  const fichajesForExport = filteredFichajes.map((f) => ({
    fullName: f.fullName,
    obra: f.obra ?? "",
    startTime: f.startTime,
    endTime: f.endTime,
    duracion: f.duracion,
    locationStart: f.locationStart,
    locationEnd: f.locationEnd,
  }));

  // 4. Agrupamos por empleado (para la vista en pantalla)
  const groupedByEmployee = sortedFichajes.reduce((acc, fichaje) => {
    if (!acc[fichaje.fullName]) {
      acc[fichaje.fullName] = [];
    }
    acc[fichaje.fullName].push(fichaje);
    return acc;
  }, {} as Record<string, FichajeWithEmpleado[]>);

  // Agrupamos jornada - obras
  function groupEventsByJornada(events: FichajeWithEmpleado[]): JornadaGroup[] {
    const groups: JornadaGroup[] = [];
    let currentGroup: JornadaGroup | null = null;

    events.forEach((event) => {
      if (event.type === "jornada") {
        // Nueva jornada
        currentGroup = { jornada: event, obras: [] };
        groups.push(currentGroup);
      } else if (event.type === "obra") {
        if (currentGroup) {
          // Solo añadimos la obra si entra en la ventana de la jornada
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

      {/* Filtros de exportación */}
      <div className={styles["export-filters"]}>
        <h2>Opciones de exportación</h2>
        <div className={styles["filter-group"]}>
          <label htmlFor="filterEmployee">Empleado:</label>
          <input
            id="filterEmployee"
            type="text"
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            placeholder="Nombre del empleado"
          />
        </div>
        <div className={styles["filter-group"]}>
          <label htmlFor="filterObra">Obra:</label>
          <input
            id="filterObra"
            type="text"
            value={filterObra}
            onChange={(e) => setFilterObra(e.target.value)}
            placeholder="Nombre de la obra"
          />
        </div>
        <div className={styles["filter-group"]}>
          <label htmlFor="filterStartDate">Fecha inicio:</label>
          <input
            id="filterStartDate"
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>
        <div className={styles["filter-group"]}>
          <label htmlFor="filterEndDate">Fecha fin:</label>
          <input
            id="filterEndDate"
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Mensajes de error/validación */}
      {filterErrors.length > 0 && (
        <div className={styles["error-messages"]}>
          {filterErrors.map((err, idx) => (
            <p key={idx} style={{ color: "red" }}>
              {err}
            </p>
          ))}
        </div>
      )}

      <ExportButtons fichajes={fichajesForExport} />

      {/* 6. Renderizado final, mostrando la info de localización */}
      {Object.entries(groupedByEmployee).map(([employee, events]) => {
        const sortedEvents = events.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
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
                      <strong>Ubicación Entrada:</strong>{" "}
                      {group.jornada.locationStart ? (
                        <a
                          href={`https://www.google.com/maps?q=${group.jornada.locationStart.latitude},${group.jornada.locationStart.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver mapa
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p>
                      <strong>Salida:</strong>{" "}
                      {group.jornada.endTime
                        ? new Date(group.jornada.endTime).toLocaleString()
                        : "—"}
                    </p>
                    <p>
                      <strong>Ubicación Salida:</strong>{" "}
                      {group.jornada.locationEnd ? (
                        <a
                          href={`https://www.google.com/maps?q=${group.jornada.locationEnd.latitude},${group.jornada.locationEnd.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver mapa
                        </a>
                      ) : (
                        "—"
                      )}
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
                            <th>Ubicación Entrada</th>
                            <th>Salida</th>
                            <th>Ubicación Salida</th>
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
                                {obraEvent.locationStart ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${obraEvent.locationStart.latitude},${obraEvent.locationStart.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Ver mapa
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                {obraEvent.endTime
                                  ? new Date(obraEvent.endTime).toLocaleString()
                                  : "—"}
                              </td>
                              <td>
                                {obraEvent.locationEnd ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${obraEvent.locationEnd.latitude},${obraEvent.locationEnd.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Ver mapa
                                  </a>
                                ) : (
                                  "—"
                                )}
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
