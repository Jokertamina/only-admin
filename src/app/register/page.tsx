"use client"; // Necesario para usar hooks en Next.js 13

import { useState, useRef } from "react";
import { auth, db } from "../../lib/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../styles/RegisterPage.module.css"; // Importa el CSS Module

export default function RegisterPage() {
  const router = useRouter();
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [nif, setNif] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Estados de error para campos individuales
  const [nifError, setNifError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const nifInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Funciones de validación
  const validateNIF = (value: string): string => {
    const nifPattern = /^[0-9]{8}[A-Z]$/;      // NIF: 8 dígitos + 1 letra
    const cifPattern = /^[A-HJ-NP-SUVW][0-9]{7}[0-9A-J]$/; // CIF: 1 letra + 7 dígitos + letra/dígito
    if (!nifPattern.test(value) && !cifPattern.test(value)) {
      return "Formato de NIF/CIF incorrecto";
    }
    return "";
  };

  const validateEmail = (value: string): string => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return "Correo electrónico no válido";
    }
    return "";
  };

  const validatePassword = (value: string): string => {
    if (value.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    return "";
  };

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (/^[A-Za-z0-9]*$/.test(value) && value.length <= 9) {
      setNif(value);
    }
    if (nifInputRef.current) {
      if (value.length === 9) {
        const errorMsg = validateNIF(value);
        if (errorMsg) {
          nifInputRef.current.style.borderColor = "red";
          setNifError(errorMsg);
        } else {
          nifInputRef.current.style.borderColor = "green";
          setNifError("");
        }
      } else {
        nifInputRef.current.style.borderColor = "";
        setNifError("");
      }
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailInputRef.current) {
      const errorMsg = validateEmail(value);
      if (errorMsg) {
        emailInputRef.current.style.borderColor = "red";
        setEmailError(errorMsg);
      } else {
        emailInputRef.current.style.borderColor = "green";
        setEmailError("");
      }
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordInputRef.current) {
      const errorMsg = validatePassword(value);
      if (errorMsg) {
        passwordInputRef.current.style.borderColor = "red";
        setPasswordError(errorMsg);
      } else {
        passwordInputRef.current.style.borderColor = "green";
        setPasswordError("");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Sanitizar entradas
    const trimmedNombreEmpresa = nombreEmpresa.trim();
    const trimmedDomicilio = domicilio.trim();
    const trimmedNIF = nif.trim().toUpperCase();
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedContactPhone = contactPhone.trim();

    // Validar campos antes de enviar
    if (validateNIF(trimmedNIF)) {
      setNifError("Formato de NIF/CIF incorrecto");
      return;
    }
    if (validateEmail(trimmedEmail)) {
      setEmailError("Correo electrónico no válido");
      return;
    }
    if (validatePassword(trimmedPassword)) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const uid = userCred.user.uid;

      const docRef = await addDoc(collection(db, "Empresas"), {
        nombre: trimmedNombreEmpresa,
        domicilio: trimmedDomicilio,
        nif: trimmedNIF,
        contactPhone: trimmedContactPhone,
        plan: "SIN_PLAN",
      });
      const empresaId = docRef.id;

      await addDoc(collection(db, "Users"), {
        uid,
        empresaId,
      });

      router.push("/admin");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  };

  return (
    <main className={styles["register-page"]}>
      <div className={styles["register-card"]}>
        <h1 className={styles["register-heading"]}>Registro</h1>
        <form onSubmit={handleRegister} className={styles["register-form"]}>
          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]} htmlFor="companyName">
              Nombre de la empresa
            </label>
            <input
              id="companyName"
              type="text"
              placeholder="Nombre de la empresa"
              className={styles["register-input"]}
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              required
            />
          </div>
          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]} htmlFor="domicilio">
              Domicilio Legal
            </label>
            <input
              id="domicilio"
              type="text"
              placeholder="Domicilio legal"
              className={styles["register-input"]}
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
              required
            />
          </div>
          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]} htmlFor="nif">
              NIF / CIF
            </label>
            <input
              ref={nifInputRef}
              id="nif"
              type="text"
              placeholder="NIF o CIF"
              className={styles["register-input"]}
              value={nif}
              onChange={handleNifChange}
              pattern="^(?:[0-9]{8}[A-Z]|[A-HJ-NP-SUVW][0-9]{7}[0-9A-J])$"
              minLength={9}
              maxLength={9}
              required
            />
            {nifError && <p className={styles["input-error"]}>{nifError}</p>}
          </div>
          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]} htmlFor="contactPhone">
              Teléfono de contacto
            </label>
            <input
              id="contactPhone"
              type="tel"
              placeholder="Ej: +34 600 000 000"
              className={styles["register-input"]}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]} htmlFor="email">
              Email
            </label>
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              placeholder="Correo electrónico"
              className={styles["register-input"]}
              value={email}
              onChange={handleEmailChange}
              required
            />
            {emailError && <p className={styles["input-error"]}>{emailError}</p>}
          </div>
          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]} htmlFor="password">
              Contraseña
            </label>
            <input
              ref={passwordInputRef}
              id="password"
              type="password"
              placeholder="Contraseña"
              className={styles["register-input"]}
              value={password}
              onChange={handlePasswordChange}
              required
            />
            {passwordError && <p className={styles["input-error"]}>{passwordError}</p>}
          </div>
          {error && <p className={styles["register-error"]}>{error}</p>}
          <button type="submit" className={styles["register-button"]}>
            Registrarme
          </button>
        </form>
        <p className={styles["register-extra"]}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className={styles["register-link"]}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
