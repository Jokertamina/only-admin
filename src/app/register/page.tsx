"use client";

import { useState, useRef } from "react";
import { auth, db } from "../../lib/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import styles from "../styles/RegisterPage.module.css";

export default function RegisterPage() {

  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [nif, setNif] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [nifError, setNifError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const nifInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const validateNIF = (value: string): string => {
    const nifPattern = /^[0-9]{8}[A-Z]$/;
    const cifPattern = /^[A-HJ-NP-SUVW][0-9]{7}[0-9A-J]$/;
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
        nifInputRef.current.style.borderColor = errorMsg ? "red" : "green";
        setNifError(errorMsg);
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
      emailInputRef.current.style.borderColor = errorMsg ? "red" : "green";
      setEmailError(errorMsg);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordInputRef.current) {
      const errorMsg = validatePassword(value);
      passwordInputRef.current.style.borderColor = errorMsg ? "red" : "green";
      setPasswordError(errorMsg);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedNombreEmpresa = nombreEmpresa.trim();
    const trimmedDomicilio = domicilio.trim();
    const trimmedNIF = nif.trim().toUpperCase();
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedContactPhone = contactPhone.trim();

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
        subscriptionId: "",
        email: trimmedEmail,
      });
      const empresaId = docRef.id;

      await addDoc(collection(db, "Users"), {
        uid,
        empresaId,
      });

      let foundEmpresaId = false;
      const usersRef = collection(db, "Users");
      const MAX_ATTEMPTS = 3;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const q = query(usersRef, where("uid", "==", uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDoc = snap.docs[0].data();
          if (userDoc.empresaId === empresaId) {
            foundEmpresaId = true;
            console.log(`[Registro] Confirmado empresaId ${empresaId} (Intento ${attempt}).`);
            break;
          }
        }
      }

      if (!foundEmpresaId) {
        console.warn("[Registro] empresaId no detectado tras varios intentos.");
      }
       // Llamada a notificación para registro de empresa
       await fetch("/api/notify-company-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "register",
          empresaId: empresaId,
          nombre: nombreEmpresa,
          email: trimmedEmail,
        }),
      });

      window.location.href = "/admin";
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
            <label className={styles["register-label"]}>Nombre de la empresa</label>
            <input type="text" className={styles["register-input"]} value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} required/>
          </div>

          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]}>Domicilio Legal</label>
            <input type="text" className={styles["register-input"]} value={domicilio} onChange={(e) => setDomicilio(e.target.value)} required/>
          </div>

          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]}>NIF / CIF</label>
            <input ref={nifInputRef} type="text" className={styles["register-input"]} value={nif} onChange={handleNifChange} required/>
            {nifError && <p className={styles["input-error"]}>{nifError}</p>}
          </div>

          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]}>Teléfono de contacto</label>
            <input type="tel" className={styles["register-input"]} value={contactPhone} onChange={(e) => /^\+?[0-9]*$/.test(e.target.value) && setContactPhone(e.target.value)} required/>
          </div>

          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]}>Email</label>
            <input ref={emailInputRef} type="email" className={styles["register-input"]} value={email} onChange={handleEmailChange} required/>
            {emailError && <p className={styles["input-error"]}>{emailError}</p>}
          </div>

          <div className={styles["register-form-group"]}>
            <label className={styles["register-label"]}>Contraseña</label>
            <input ref={passwordInputRef} type="password" className={styles["register-input"]} value={password} onChange={handlePasswordChange} required/>
            {passwordError && <p className={styles["input-error"]}>{passwordError}</p>}
          </div>

          {error && <p className={styles["register-error"]}>{error}</p>}

          <button type="submit" className={styles["register-button"]}>Registrarme</button>
        </form>

        <p className={styles["register-extra"]}>
          ¿Ya tienes cuenta? <Link href="/login" className={styles["register-link"]}>Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
