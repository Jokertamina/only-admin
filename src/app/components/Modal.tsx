"use client"; // Necesario para usar useState y useEffect

import { useRouter } from "next/navigation"; // Usamos next/navigation en lugar de react-router-dom
import styles from "../styles/Modal.module.css"; // Importamos los estilos como CSS Modules

interface ModalProps {
  message: string;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ message, onClose }) => {
  const router = useRouter();

  return (
    <div className={styles["modal-overlay"]}>
      <div className={styles["modal-content"]}>
        <h2>Atención</h2>
        <p>{message}</p>
        <div className={styles["modal-actions"]}>
          <button
            className={styles["modal-button"]}
            onClick={() => {
              onClose();
              router.push("/login");
            }}
          >
            Iniciar sesión
          </button>
          <button
            className={styles["modal-button"]}
            onClick={() => {
              onClose();
              router.push("/register");
            }}
          >
            Registrarse
          </button>
          <button
            className={`${styles["modal-button"]} ${styles["close-button"]}`}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
