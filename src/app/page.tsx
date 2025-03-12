"use client"; // Necesario para usar hooks en Next.js 13

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import styles from "./styles/HomePage.module.css"; // Importa el CSS como módulo

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleCtaClick = () => {
    if (user) {
      router.push("/admin"); // Redirige a /admin si está autenticado
    } else {
      router.push("/login"); // Redirige a /auth/login si no está autenticado
    }
  };

  return (
    <main className={styles["home-container"]}>
      <section className={styles["hero-section"]}>
        <h1 className={styles["home-heading"]}>Bienvenido a MiProducto</h1>
        <p className={styles["home-description"]}>
          Aquí iría la información de marketing de tu producto.
        </p>
        <button className={styles["cta-button"]} onClick={handleCtaClick}>
          {user ? "Accede al panel" : "Empieza ahora"}
        </button>
      </section>
    </main>
  );
}
