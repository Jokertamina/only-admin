"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import Image from "next/image";
import styles from "./styles/HomePage.module.css";

export default function Home() {
  const router = useRouter();
  // Evitamos "any" y usamos User | null
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleCtaClick = () => {
    if (user) {
      router.push("/admin");
    } else {
      router.push("/login");
    }
  };

  return (
    <main className={styles.homeContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroHeading}>Bienvenido a MiProducto</h1>
          <p className={styles.heroDescription}>
            Descubre la solución definitiva para optimizar tus procesos,
            automatizar tareas y tomar decisiones basadas en datos.
          </p>
          <button className={styles.ctaButton} onClick={handleCtaClick}>
            {user ? "Accede al Panel" : "Empieza Ahora"}
          </button>
        </div>
        <div className={styles.heroImage}>
          <Image
            src="/images/hero-image.jpg"
            alt="Vista del producto"
            width={600}
            height={400}
            // Ajusta los valores width/height según tus imágenes
          />
        </div>
      </section>

      {/* Funcionalidad 1: Automatización */}
      <section className={styles.featureSection}>
        <div className={styles.featureImage}>
          <Image
            src="/images/feature-automation.jpg"
            alt="Automatización inteligente"
            width={600}
            height={400}
          />
        </div>
        <div className={styles.featureContent}>
          <h2 className={styles.featureHeading}>Automatización Inteligente</h2>
          <p className={styles.featureDescription}>
            Deja que la inteligencia artificial se encargue de las tareas
            repetitivas, permitiéndote concentrarte en lo que realmente importa.
          </p>
        </div>
      </section>

      {/* Funcionalidad 2: Integración sin esfuerzo */}
      <section className={styles.featureSectionReverse}>
        <div className={styles.featureContent}>
          <h2 className={styles.featureHeading}>Integración Sin Esfuerzo</h2>
          <p className={styles.featureDescription}>
            Conecta tus sistemas existentes de forma rápida y segura gracias a
            nuestra API robusta y flexible.
          </p>
        </div>
        <div className={styles.featureImage}>
          <Image
            src="/images/feature-integration.jpg"
            alt="Integración sin esfuerzo"
            width={600}
            height={400}
          />
        </div>
      </section>

      {/* Funcionalidad 3: Análisis en tiempo real */}
      <section className={styles.featureSection}>
        <div className={styles.featureImage}>
          <Image
            src="/images/feature-analytics.jpg"
            alt="Análisis en tiempo real"
            width={600}
            height={400}
          />
        </div>
        <div className={styles.featureContent}>
          <h2 className={styles.featureHeading}>Datos y Análisis</h2>
          <p className={styles.featureDescription}>
            Accede a informes detallados y toma decisiones informadas con datos
            precisos y actualizados en tiempo real.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaHeading}>Da el Siguiente Paso Hacia la Innovación</h2>
        <p className={styles.ctaDescription}>
          Únete a las empresas que ya están transformando su forma de trabajar.
        </p>
        <button className={styles.ctaButton} onClick={handleCtaClick}>
          {user ? "Accede al Panel" : "Empieza Ahora"}
        </button>
      </section>
    </main>
  );
}
