"use client"; // Necesario para usar `useState` y `useEffect`

import Link from "next/link"; // Usamos `next/link` en lugar de `react-router-dom`
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import styles from "../styles/SideBar.module.css"; // Importamos el archivo de estilos como CSS Modules

export default function SideBar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles["sidebar-header"]}>
        <h2>Admin Panel</h2>
      </div>
      <nav className={styles["sidebar-nav"]}>
        <Link href="/" className={styles["sidebar-link"]}>
          Dashboard
        </Link>
        <Link href="/empresas" className={styles["sidebar-link"]}>
          Empresa
        </Link>
        <Link href="/obras" className={styles["sidebar-link"]}>
          Obras
        </Link>
        <Link href="/empleados" className={styles["sidebar-link"]}>
          Empleados
        </Link>
        <Link href="/fichajes" className={styles["sidebar-link"]}>
          Fichajes
        </Link>
        <Link href="/precios" className={styles["sidebar-link"]}>
          Planes y Precios
        </Link>
      </nav>
      <div className={styles["sidebar-footer"]}>
        <button onClick={handleLogout} className={styles["logout-button"]}>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
