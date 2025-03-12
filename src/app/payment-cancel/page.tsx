"use client";

import styles from "../styles/PaymentCancel.module.css";

export default function PaymentCancel() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Pago cancelado</h1>
      <p className={styles.message}>
        Tu compra no se ha completado. Vuelve a intentarlo si lo deseas.
      </p>
    </div>
  );
}
