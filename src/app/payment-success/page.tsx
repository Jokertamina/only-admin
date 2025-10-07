"use client";

import styles from "../styles/PaymentSuccess.module.css";
import Link from "next/link";

export default function PaymentSuccess() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>¡Pago exitoso!</h1>
      <p className={styles.message}>
        Gracias por tu compra. Tu plan ha sido activado correctamente.
      </p>
      <Link href="/" className={styles.link}>
        Ir al Panel de Administración
      </Link>
    </div>
  );
}
