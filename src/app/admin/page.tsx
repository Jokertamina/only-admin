"use client"; // Necesario para usar useEffect y useState

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation"; // Usamos next/navigation en lugar de react-router-dom
import Loading from "../components/Loading";
import styles from "../styles/AdminPage.module.css"; // Importamos como objeto

const AdminPage = () => {
  const router = useRouter(); // Para la navegación
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login"); // Redirige al login si el usuario no está autenticado
      } else {
        setUser(firebaseUser); // Establece el usuario autenticado
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <Loading />; // Muestra el loading mientras se verifica el usuario
  if (!user) return null; // Si no hay usuario, no renderiza nada

  return (
    <main className={styles["admin-page-container"]}>
      <h1 className={styles["admin-page-title"]}>Panel de Administración</h1>
      <p className={styles["admin-page-welcome"]}>Bienvenido, {user.email}.</p>
    </main>
  );
};

export default AdminPage;
