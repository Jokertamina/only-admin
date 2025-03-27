import "@/app/globals.css";
import ClientWrapper from "./components/ClientWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SYMCROX | Control de fichajes y gestión de obras en tiempo real",
  description:
    "Gestiona registros horarios, controla empleados y optimiza presupuestos fácilmente con SYMCROX. Registra fichajes desde Telegram y WhatsApp.",
  keywords:
    "registro horarios empleados, fichajes telegram, fichajes whatsapp, control horas obras, gestión empleados, optimizar costes proyectos, bot fichajes telegram, bot fichajes whatsapp",
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
    canonical: "https://symcrox.com/",
  },
  openGraph: {
    title: "SYMCROX | Control de fichajes y gestión de obras en tiempo real",
    description:
      "Gestiona registros horarios, controla empleados y optimiza presupuestos fácilmente con SYMCROX. Registra fichajes desde Telegram y WhatsApp.",
    url: "https://symcrox.com",
    siteName: "SYMCROX",
    locale: "es_ES",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "SYMCROX Fichajes en Tiempo Real",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@SYMCROX",
    creator: "@SYMCROX",
    title: "SYMCROX | Control de fichajes y gestión de obras",
    description:
      "Registra fichajes desde Telegram y WhatsApp. Gestiona horarios de empleados y optimiza proyectos con SYMCROX.",
    images: ["/og-image.jpg"],
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
    name: "SYMCROX",
    url: "https://symcrox.com",
    logo: "https://symcrox.com/logo.png",
    sameAs: ["https://www.instagram.com/SYMCROX"],
  };

  return (
    <html lang="es">
      <head>
        {/* Favicons y Web Manifest */}
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
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
