"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "../styles/ExportButtons.module.css";

// Definimos el tipo pdfMake
type PdfMakeType = {
  vfs: unknown;
  createPdf: (docDefinition: Record<string, unknown>) => {
    download: (filename: string) => void;
  };
};

interface LocationData {
  latitude: number;
  longitude: number;
}

// Ajustamos la interfaz para incluir las ubicaciones
interface FichajeForExport {
  id: string;
  empresaId: string;
  fullName: string;
  obra: string;
  startTime: string;
  endTime: string | null;
  duracion?: number | null;
  locationStart?: LocationData | null;
  locationEnd?: LocationData | null;
}

interface ExportButtonsProps {
  fichajes: FichajeForExport[];
}

// 1) Tipo para las celdas de la tabla pdfMake (string o { text, link, color, ... })
type TableCell =
  | string
  | {
      text: string;
      link?: string;
      color?: string;
      // agrega otras propiedades de pdfMake si las necesitas
    };

export default function ExportButtons({ fichajes }: ExportButtonsProps) {
  const [pdfMake, setPdfMake] = useState<PdfMakeType | null>(null);

  useEffect(() => {
    async function loadPdfMake() {
      // Importamos dinámicamente los módulos
      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

      const pdfMakeObj = (pdfMakeModule.default ?? pdfMakeModule) as PdfMakeType;
      const pdfFontsUnknown = pdfFontsModule as unknown;
      const pdfFontsRecord: Record<string, unknown> = pdfFontsUnknown as Record<string, unknown>;

      pdfMakeObj.vfs =
        (pdfFontsRecord.default as { pdfMake?: { vfs?: unknown } })?.pdfMake?.vfs ||
        (pdfFontsRecord.pdfMake as { vfs?: unknown })?.vfs;

      setPdfMake(pdfMakeObj);
    }
    loadPdfMake();
  }, []);

  // --------------------------------------------------------------------------------
  // 1) Exportar a Excel
  const exportToExcel = () => {
    // Construimos el array de objetos a exportar
    // Agregamos la "Ubic. Inicio" y "Ubic. Fin" como fórmulas de Excel
    const worksheetData = fichajes.map((f) => {
      // Si no hay ubicación, ponemos "—"
      const linkStart = f.locationStart
        ? `=HYPERLINK("https://maps.google.com?q=${f.locationStart.latitude},${f.locationStart.longitude}","Ver mapa")`
        : "—";

      const linkEnd = f.locationEnd
        ? `=HYPERLINK("https://maps.google.com?q=${f.locationEnd.latitude},${f.locationEnd.longitude}","Ver mapa")`
        : "—";

      return {
        ID: f.id,
        EmpresaID: f.empresaId,
        Empleado: f.fullName,
        Obra: f.obra,
        Entrada: new Date(f.startTime).toLocaleString(),
        "Ubic. Inicio": linkStart, // <-- Hipervínculo Excel
        Salida: f.endTime ? new Date(f.endTime).toLocaleString() : "—",
        "Ubic. Fin": linkEnd, // <-- Hipervínculo Excel
        "Duración (hrs)": f.duracion != null ? f.duracion.toFixed(2) : "",
      };
    });

    // Creamos el worksheet a partir del array
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // 2) Convertir celdas que empiecen con '=HYPERLINK(...' a fórmulas reales
    //    para que Excel no las trate como texto literal.
    Object.keys(worksheet).forEach((cellAddress) => {
      const cell = worksheet[cellAddress];
      if (
        cell &&
        typeof cell.v === "string" &&
        cell.v.startsWith("=HYPERLINK(")
      ) {
        // Quitamos el '=' y movemos la fórmula a cell.f
        cell.f = cell.v.slice(1); // "HYPERLINK(..."
        // Borramos el valor literal y marcamos la celda como "formula"
        cell.v = undefined;
        cell.t = "n"; // Type 'n' indica number/formula
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fichajes");

    // Generamos el Excel y lo descargamos
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "fichajes.xlsx");
  };

  // --------------------------------------------------------------------------------
  // 2) Exportar a PDF
  const exportToPDF = () => {
    if (!pdfMake) return;

    // Definimos 'body' como un array de arrays de TableCell
    const body: TableCell[][] = [
      [
        "ID",
        "EmpresaID",
        "Empleado",
        "Obra",
        "Entrada",
        "Ubic. Inicio",
        "Salida",
        "Ubic. Fin",
        "Duración (hrs)",
      ],
    ];

    fichajes.forEach((f) => {
      // Preparamos las celdas "Ubic. Inicio" y "Ubic. Fin" como objetos con enlace
      const startLink: TableCell = f.locationStart
        ? {
            text: "Ver mapa",
            link: `https://maps.google.com?q=${f.locationStart.latitude},${f.locationStart.longitude}`,
            color: "blue",
          }
        : "—";

      const endLink: TableCell = f.locationEnd
        ? {
            text: "Ver mapa",
            link: `https://maps.google.com?q=${f.locationEnd.latitude},${f.locationEnd.longitude}`,
            color: "blue",
          }
        : "—";

      body.push([
        f.id,
        f.empresaId,
        f.fullName,
        f.obra,
        new Date(f.startTime).toLocaleString(),
        startLink,
        f.endTime ? new Date(f.endTime).toLocaleString() : "—",
        endLink,
        f.duracion != null ? f.duracion.toFixed(2) : "",
      ]);
    });

    // Definimos docDefinition
    const docDefinition: Record<string, unknown> = {
      pageOrientation: "landscape",
      content: [
        { text: "Reporte de Fichajes", style: "header" },
        {
          table: {
            widths: ["auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
            body,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
      },
    };

    // Generamos el PDF y descargamos
    pdfMake.createPdf(docDefinition).download("fichajes.pdf");
  };

  return (
    <div className={styles["export-buttons"]}>
      <button onClick={exportToExcel} className={`${styles.btn} ${styles["btn-excel"]}`}>
        Exportar Excel
      </button>
      <button onClick={exportToPDF} className={`${styles.btn} ${styles["btn-pdf"]}`}>
        Exportar PDF
      </button>
    </div>
  );
}
