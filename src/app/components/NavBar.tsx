"use client"; // Necesario porque usamos useState y useEffect en Next.js

import Link from "next/link";
import Image from "next/image"; // ✅ Importación corregida
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import styles from "../styles/NavBar.module.css"; // ✅ Importación correcta

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles["navbar-container"]}>
        <Link href="/" className={styles["navbar-brand"]}>
          <div className={styles["logo-container"]}>
            <Image
              src="/images/logo-nombre.svg"
              alt="Symcrox Logo"
              width={180} // Ajustado
              height={60} // Ajustado
              priority
              className={styles["logo-img"]}
            />
          </div>
        </Link>

        <button className={styles["navbar-hamburger"]} onClick={toggleMenu}>
          <span className={styles["hamburger-icon"]}></span>
          <span className={styles["hamburger-icon"]}></span>
          <span className={styles["hamburger-icon"]}></span>
        </button>
        <div className={`${styles["navbar-links"]} ${menuOpen ? styles.active : ""}`}>
          <Link href="/pricing" className={styles["navbar-link"]} onClick={() => setMenuOpen(false)}>
            Precios
          </Link>
          {user ? (
            <>
              <Link href="/admin" className={styles["navbar-link"]} onClick={() => setMenuOpen(false)}>
                Panel Admin
              </Link>
              <button onClick={handleLogout} className={styles["navbar-button"]}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles["navbar-link"]} onClick={() => setMenuOpen(false)}>
                Login
              </Link>
              <Link href="/register" className={styles["navbar-link"]} onClick={() => setMenuOpen(false)}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
