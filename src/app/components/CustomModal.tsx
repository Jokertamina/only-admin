"use client";

import styles from "../styles/CustomModal.module.css";

interface CustomModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type: "alert" | "confirm";
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function CustomModal({
  isOpen,
  title,
  message,
  type,
  onConfirm,
  onCancel,
}: CustomModalProps) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {title && <h2 className={styles.modalTitle}>{title}</h2>}
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalButtons}>
          {type === "confirm" ? (
            <>
              <button onClick={onConfirm} className={styles.modalBtnConfirm}>
                Confirmar
              </button>
              <button onClick={onCancel} className={styles.modalBtnCancel}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={onConfirm} className={styles.modalBtnOk}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
