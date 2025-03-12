"use client"; // Necesario para usar `useState` y `useEffect`

import styles from "../styles/Loading.module.css"; // Importamos los estilos con CSS Modules

export default function Loading() {
  return (
    <div className={styles["loading-container"]}>
      <div className={styles["spinner"]}></div>
      <p className={styles["loading-text"]}>Cargando...</p>
    </div>
  );
}
