"use client"; // Necesario para componentes que usan hooks en Next.js 13

import { useState } from "react";
import { auth } from "../../lib/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../styles/LoginPage.module.css"; // Importamos el CSS Module

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className={styles["login-page"]}>
      <div className={styles["login-card"]}>
        <h1 className={styles["login-heading"]}>Iniciar Sesión</h1>
        <form onSubmit={handleLogin} className={styles["login-form"]}>
          <div className={styles["login-form-group"]}>
            <label className={styles["login-label"]} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Correo electrónico"
              className={styles["login-input"]}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles["login-form-group"]}>
            <label className={styles["login-label"]} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="Contraseña"
              className={styles["login-input"]}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className={styles["login-error"]}>{error}</p>}
          <button type="submit" className={styles["login-button"]}>
            Ingresar
          </button>
        </form>
        <p className={styles["login-extra"]}>
          ¿No tienes cuenta?{" "}
          <Link href="/register" className={styles["login-link"]}>
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
