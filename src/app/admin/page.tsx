"use client"; // Necesario para usar hooks en Next.js 13

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Loading from "../components/Loading";
import styles from "../styles/AdminPage.module.css";

// Componente modal para compartir el bot
type ShareModalProps = {
  botUrl: string;
  onClose: () => void;
};

function ShareModal({ botUrl, onClose }: ShareModalProps) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(botUrl);
      alert("Enlace copiado al portapapeles");
    } catch (error) {
      console.error("Error copiando el enlace:", error);
      alert("No se pudo copiar el enlace");
    }
  };

  return (
    <div className={styles["share-modal-overlay"]}>
      <div className={styles["share-modal"]}>
        <h2 className={styles["share-modal-title"]}>Compartir Bot</h2>
        <p className={styles["share-modal-description"]}>
          Selecciona la aplicación para compartir el enlace de nuestro bot:
        </p>
        <div className={styles["share-modal-buttons"]}>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(
              botUrl
            )}&text=${encodeURIComponent("¡Este es el bot para los fichajes!")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles["share-button"]}
          >
            Telegram
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              "¡Este es el bot para los fichajes!\n" + botUrl
            )}`}
            
            target="_blank"
            rel="noopener noreferrer"
            className={styles["share-button"]}
          >
            WhatsApp
          </a>
          <button onClick={handleCopyLink} className={styles["share-button"]}>
            Copiar Enlace
          </button>
        </div>
        <button onClick={onClose} className={styles["share-modal-close"]}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

const AdminPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const botUrl = "https://t.me/RegistroJornada_bot"; // Enlace del bot
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    async function fetchCompanyName() {
      if (!user) return;
      try {
        const usersRef = collection(db, "Users");
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const userDoc = querySnap.docs[0];
          const userData = userDoc.data();
          const empresaId = userData.empresaId as string;
          const empresaRef = doc(db, "Empresas", empresaId);
          const empresaSnap = await getDoc(empresaRef);
          if (empresaSnap.exists()) {
            const empresaData = empresaSnap.data();
            setCompanyName(empresaData.nombre || "");
          }
        }
      } catch (error) {
        console.error("[AdminPage] Error al cargar nombre de la empresa:", error);
      }
    }
    fetchCompanyName();
  }, [user]);

  if (loading) return <Loading />;
  if (!user) return null;

  return (
    <main className={styles["admin-page-container"]}>
      <h1 className={styles["admin-page-title"]}>Panel de Administración</h1>
      <p className={styles["admin-page-welcome"]}>
        Bienvenido, {companyName ? companyName : user.email}.
      </p>
      <section className={styles["admin-page-info"]}>
        <h2 className={styles["admin-page-subtitle"]}>Herramientas del Panel</h2>
        <ul className={styles["admin-page-list"]}>
          <li>Gestión de Empresas</li>
          <li>Administración de Empleados</li>
          <li>Control de Fichajes</li>
          <li>Visualización de Reportes</li>
        </ul>
        <p className={styles["admin-page-description"]}>
          En este panel encontrarás herramientas para gestionar tu empresa, administrar usuarios, configurar planes y monitorizar la actividad de tus proyectos. Utiliza el menú lateral para navegar entre las secciones.
        </p>
      </section>
      {/* Sección para compartir el enlace del bot */}
      <section className={styles["admin-page-share"]}>
        <h3 className={styles["admin-page-share-title"]}>Comparte nuestro Bot</h3>
        <button
          onClick={() => setShowShareModal(true)}
          className={styles["admin-page-share-trigger"]}
        >
          Compartir Enlace
        </button>
      </section>
      {showShareModal && (
        <ShareModal botUrl={botUrl} onClose={() => setShowShareModal(false)} />
      )}
    </main>
  );
};

export default AdminPage;
