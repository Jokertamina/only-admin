"use client";

import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
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

// Actualizamos la interfaz para excluir 'id' y 'empresaId'
interface FichajeForExport {
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

// Tipo para las celdas de la tabla pdfMake (string o { text, link, color, ... })
type TableCell =
  | string
  | {
      text: string;
      link?: string;
      color?: string;
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

  // Exportar a Excel con exceljs
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Fichajes");

    // Definir columnas sin ID y EmpresaID
    worksheet.columns = [
      { header: "Empleado", key: "fullName", width: 20 },
      { header: "Obra", key: "obra", width: 20 },
      { header: "Entrada", key: "startTime", width: 20 },
      { header: "Ubic. Inicio", key: "locationStart", width: 20 },
      { header: "Salida", key: "endTime", width: 20 },
      { header: "Ubic. Fin", key: "locationEnd", width: 20 },
      { header: "Duración (hrs)", key: "duracion", width: 15 },
    ];

    // Agregar cada fichaje como fila
    fichajes.forEach((f) => {
      const startTime = new Date(f.startTime).toLocaleString();
      const endTime = f.endTime ? new Date(f.endTime).toLocaleString() : "—";
      const locationStart = f.locationStart
        ? { text: "Ver mapa", hyperlink: `https://maps.google.com?q=${f.locationStart.latitude},${f.locationStart.longitude}` }
        : "—";
      const locationEnd = f.locationEnd
        ? { text: "Ver mapa", hyperlink: `https://maps.google.com?q=${f.locationEnd.latitude},${f.locationEnd.longitude}` }
        : "—";

      worksheet.addRow({
        fullName: f.fullName,
        obra: f.obra,
        startTime: startTime,
        locationStart: locationStart,
        endTime: endTime,
        locationEnd: locationEnd,
        duracion: f.duracion != null ? f.duracion.toFixed(2) : "",
      });
    });

    // Escribir el workbook a un buffer y descargarlo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "fichajes.xlsx");
  };

  // Exportar a PDF
  const exportToPDF = () => {
    if (!pdfMake) return;

    // Definir 'body' como un array de arrays de TableCell, sin ID ni EmpresaID
    const body: TableCell[][] = [
      ["Empleado", "Obra", "Entrada", "Ubic. Inicio", "Salida", "Ubic. Fin", "Duración (hrs)"],
    ];

    fichajes.forEach((f) => {
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
        f.fullName,
        f.obra,
        new Date(f.startTime).toLocaleString(),
        startLink,
        f.endTime ? new Date(f.endTime).toLocaleString() : "—",
        endLink,
        f.duracion != null ? f.duracion.toFixed(2) : "",
      ]);
    });

    const docDefinition: Record<string, unknown> = {
      pageOrientation: "landscape",
      content: [
        { text: "Reporte de Fichajes", style: "header" },
        {
          table: {
            widths: ["auto", "auto", "auto", "auto", "auto", "auto", "auto"],
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
