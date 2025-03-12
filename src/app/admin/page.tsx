"use client"; // Necesario para usar useEffect y useState

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation"; // Usamos next/navigation en lugar de react-router-dom
import Loading from "../components/Loading";
import styles from "../styles/AdminPage.module.css"; // Importamos como objeto

const AdminPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login"); // Redirige al login si el usuario no está autenticado
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <Loading />;
  if (!user) return null;

  return (
    <main className={styles["admin-page-container"]}>
      <h1 className={styles["admin-page-title"]}>Panel de Administración</h1>
      <p className={styles["admin-page-welcome"]}>Bienvenido, {user.email}.</p>
    </main>
  );
};

export default AdminPage;
