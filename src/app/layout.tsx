import "@/app/globals.css";
import ClientWrapper from "./components/ClientWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¡Optimiza tu empresa con FICHAGRAM! | Control de fichajes y gestión de obras",
  description:
    "Optimiza tus procesos y reduce costes: controla fichajes, gestiona empleados y obras o proyectos digitalmente. Registra desde Telegram y WhatsApp con FICHAGRAM.",
  keywords:
    "fichajes digitales, control de asistencia, gestión de empleados, optimización de obras, bot fichajes, Telegram, WhatsApp",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  robots: "index, follow",
  alternates: {
    canonical: "https://fichagram.com/",
  },
  openGraph: {
    title: "¡Optimiza tu empresa con FICHAGRAM! | Control de fichajes y gestión de obras",
    description:
      "Optimiza tus procesos y reduce costes: controla fichajes, gestiona empleados y obras o proyectos digitalmente. Registra desde Telegram y WhatsApp con FICHAGRAM.",
    url: "https://fichagram.com",
    siteName: "FICHAGRAM",
    locale: "es_ES",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "FICHAGRAM: Fichajes en Tiempo Real y Gestión de Obras",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FICHAGRAM",
    url: "https://fichagram.com",
    logo: "https://fichagram.com/logo.png",
    sameAs: ["https://www.instagram.com/FICHAGRAM"],
  };

  return (
    <html lang="es">
      <head>
        {/* Favicons y Web Manifest */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Datos estructurados JSON‑LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
