"use client"; // Necesario para usar hooks en Next.js 13

import { useState } from "react";
import { auth } from "../../lib/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CustomModal from "../components/CustomModal";
import Loading from "../components/Loading";
import styles from "../styles/LoginPage.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para el modal de restablecimiento de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  // Estado para el modal de éxito del restablecimiento
  const [showResetSuccessModal, setShowResetSuccessModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
      // Si la redirección falla, refrescamos la página tras 3 segundos
      setTimeout(() => {
        router.refresh();
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Función para enviar el correo de restablecimiento
  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetError("Por favor, ingresa tu correo.");
      return;
    }
    try {
      const res = await fetch("/api/sendPasswordResetEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (data.success) {
        // Cerramos el modal de ingreso y abrimos el de éxito
        setShowResetModal(false);
        setShowResetSuccessModal(true);
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error al enviar el correo de restablecimiento.");
    }
  };

  return (
    <main className={styles["login-page"]}>
      {isLoading ? (
        <Loading />
      ) : (
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
          <p className={styles["login-extra"]}>
            ¿Has olvidado tu contraseña?{" "}
            <span
              onClick={() => {
                setResetEmail(""); // Reseteamos el campo
                setResetError("");
                setShowResetModal(true);
              }}
              className={styles["login-link"]}
              style={{ cursor: "pointer" }}
            >
              Haz clic aquí
            </span>
          </p>
        </div>
      )}

      {showResetModal && (
        <CustomModal
          isOpen={showResetModal}
          title="Restablecer contraseña"
          message="Ingresa el correo electrónico con el que te registraste:"
          type="confirm"
          onConfirm={handleResetPassword}
          onCancel={() => setShowResetModal(false)}
        >
          <input
            type="email"
            placeholder="Correo electrónico"
            value={resetEmail}
            onChange={(e) => {
              setResetEmail(e.target.value);
              setResetError("");
            }}
            className={styles["login-input"]}
          />
          {resetError && <p className={styles["login-error"]}>{resetError}</p>}
        </CustomModal>
      )}

      {showResetSuccessModal && (
        <CustomModal
          isOpen={showResetSuccessModal}
          title="Restablecimiento enviado"
          message="Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada y, si no aparece, revisa tu carpeta de spam."
          type="alert"
          onConfirm={() => setShowResetSuccessModal(false)}
        />
      )}
    </main>
  );
}
