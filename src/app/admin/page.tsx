"use client"; // Necesario para usar hooks en Next.js 13

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Loading from "../components/Loading";
import styles from "../styles/AdminPage.module.css";

const AdminPage = () => {
  const router = useRouter();

  // Estado para el usuario de Firebase
  const [user, setUser] = useState<User | null>(null);

  // Estado para controlar la carga
  const [loading, setLoading] = useState(true);

  // Estado para guardar el nombre de la empresa
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    // 1. Escuchar cambios de auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // Si no hay usuario, redirige al login
        router.push("/login");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // 2. Una vez tenemos user, buscamos su empresa
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (!user) return;

      try {
        // a) Buscar en "Users" el doc cuyo campo "uid" == user.uid
        const usersRef = collection(db, "Users");
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          // Asumimos que solo hay un doc
          const userDoc = querySnap.docs[0];
          const userData = userDoc.data();
          const empresaId = userData.empresaId as string;

          // b) Buscar en "Empresas" el doc con esa empresaId
          const empresaRef = doc(db, "Empresas", empresaId);
          const empresaSnap = await getDoc(empresaRef);

          if (empresaSnap.exists()) {
            const empresaData = empresaSnap.data();
            // c) Guardar el campo "nombre" en companyName
            setCompanyName(empresaData.nombre || "");
          }
        }
      } catch (error) {
        console.error("[AdminPage] Error al cargar nombre de la empresa:", error);
      }
    };

    fetchCompanyName();
  }, [user]);

  if (loading) return <Loading />;
  if (!user) return null;

  return (
    <main className={styles["admin-page-container"]}>
      

      

      <section className={styles["admin-page-info"]}>
      <h1 className={styles["admin-page-title"]}>Panel de Administración</h1>
      {/* Si companyName está vacío, como fallback muestra el email */}
      <p className={styles["admin-page-welcome"]}>
        Bienvenido, {companyName ? companyName : user.email}.
      </p>
        <h2 className={styles["admin-page-subtitle"]}>Herramientas del Panel</h2>
        <ul className={styles["admin-page-list"]}>
          <li>Gestión de Empresas</li>
          <li>Administración de Empleados</li>
          <li>Control de Fichajes</li>
          <li>Visualización de Reportes</li>
        </ul>
        <p className={styles["admin-page-description"]}>
          En este panel de administración encontrarás herramientas para gestionar tu empresa,
          administrar usuarios, configurar planes y monitorizar la actividad de tus proyectos.
          Utiliza el menú lateral para acceder a las diferentes secciones y personalizar tu experiencia.
        </p>
      </section>
    </main>
  );
};

export default AdminPage;
