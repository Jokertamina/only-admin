"use client"; // Necesario para usar `useState` y `useEffect`

import Link from "next/link"; // Usamos `next/link` en lugar de `react-router-dom`
import styles from "../styles/SideBar.module.css"; // Importamos el archivo de estilos como CSS Modules

export default function SideBar() {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles["sidebar-nav"]}>
        <Link href="/admin/empresas" className={styles["sidebar-link"]}>
          Empresa
        </Link>
        <Link href="/admin/obras" className={styles["sidebar-link"]}>
          Obras
        </Link>
        <Link href="/admin/empleados" className={styles["sidebar-link"]}>
          Empleados
        </Link>
        <Link href="/admin/fichajes" className={styles["sidebar-link"]}>
          Fichajes
        </Link>
      </nav>
    </aside>
  );
}
