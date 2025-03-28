"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import Image from "next/image";
import styles from "./styles/HomePage.module.css";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleCtaClick = () => {
    router.push(user ? "/admin" : "/login");
  };

  return (
    <main className={styles.homeContainer}>
      {/* Hero */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroHeading}>
            SYMCROX: Control de fichajes y optimización de obras
          </h1>
          <p className={styles.heroDescription}>
            Gestiona fichajes desde Telegram o WhatsApp (Proximamente), controla costes y optimiza presupuestos en tiempo real. La solución preferida por autónomos y empresas.
          </p>
          <button className={styles.ctaButton} onClick={handleCtaClick}>
            {user ? "Accede al Panel de Control" : "Pruébalo Gratis Ahora"}
          </button>
        </div>
        <div className={styles.heroImage}>
          <Image
            src="/images/bot-image.svg"
            alt="Gestión inteligente con SYMCROX"
            width={700}
            height={500}
            quality={100}
            priority
            draggable={false} // Evita arrastrar la imagen
            onContextMenu={(e) => e.preventDefault()} // Bloquea clic derecho
          />
        </div>
      </section>

      {/* Feature 1 */}
      <section className={styles.featureSection}>
        <div className={styles.featureImage}>
          <Image
            src="/images/feature-automation.svg"
            alt="Fichaje móvil rápido con Telegram y WhatsApp"
            width={600}
            height={450}
            draggable={false} // Evita arrastrar la imagen
            onContextMenu={(e) => e.preventDefault()} // Bloquea clic derecho
          />
        </div>
        <div className={styles.featureContent}>
          <h2 className={styles.featureHeading}>Fichajes rápidos desde el móvil</h2>
          <p className={styles.featureDescription}>
            Simplifica el registro de horarios desde cualquier lugar. Evita errores, olvídate del papeleo y asegúrate de cumplir con la legislación vigente.
          </p>
        </div>
      </section>

      {/* Feature 2 */}
      <section className={styles.featureSectionReverse}>
        <div className={styles.featureImage}>
          <Image
            src="/images/feature-integration.svg"
            alt="Gestión centralizada de proyectos"
            width={600}
            height={450}
            draggable={false} // Evita arrastrar la imagen
            onContextMenu={(e) => e.preventDefault()} // Bloquea clic derecho
          />
        </div>

        <div className={styles.featureContent}>
          <h2 className={styles.featureHeading}>Gestión integrada de proyectos y empleados</h2>
          <p className={styles.featureDescription}>
            Centraliza información clave de todas tus obras en un solo lugar. Administra equipos, calcula costes precisos y mejora la rentabilidad de cada proyecto.
          </p>
        </div>
      </section>

      {/* Feature 3 */}
      <section className={styles.featureSection}>
        <div className={styles.featureImage}>
          <Image
            src="/images/feature-analytics.svg"
            alt="Análisis en tiempo real con SYMCROX"
            width={600}
            height={450}
            draggable={false} // Evita arrastrar la imagen
            onContextMenu={(e) => e.preventDefault()} // Bloquea clic derecho
          />
        </div>
        <div className={styles.featureContent}>
          <h2 className={styles.featureHeading}>Analítica precisa para decisiones inteligentes</h2>
          <p className={styles.featureDescription}>
            Visualiza informes detallados en tiempo real. Identifica desviaciones, optimiza tiempos, reduce costes y aumenta la competitividad de tu negocio.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaHeading}>
          Convierte el control del tiempo en tu ventaja competitiva
        </h2>
        <p className={styles.ctaDescription}>
          Únete a los negocios inteligentes que optimizan su gestión diaria con SYMCROX. Empieza hoy mismo, ¡sin compromiso!
        </p>
        <button className={styles.ctaButton} onClick={handleCtaClick}>
          {user ? "Ir al Panel" : "Regístrate Gratis"}
        </button>
      </section>
    </main>
  );
}
