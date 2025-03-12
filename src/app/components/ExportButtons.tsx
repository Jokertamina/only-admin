"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "../styles/ExportButtons.module.css";

// Definimos un tipo para el objeto pdfMake que usaremos
type PdfMakeType = {
  vfs: unknown;
  createPdf: (docDefinition: Record<string, unknown>) => { download: (filename: string) => void };
};

interface FichajeForExport {
  id: string;
  empresaId: string;
  fullName: string;
  obra: string;
  startTime: string;
  endTime: string | null;
  duracion?: number | null;
}

interface ExportButtonsProps {
  fichajes: FichajeForExport[];
}

export default function ExportButtons({ fichajes }: ExportButtonsProps) {
  const [pdfMake, setPdfMake] = useState<PdfMakeType | null>(null);

  useEffect(() => {
    async function loadPdfMake() {
      // Importamos dinámicamente los módulos
      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

      // Asumimos que pdfMakeModule podría ser { default: PdfMakeType } o PdfMakeType directamente
      const pdfMakeObj = (pdfMakeModule.default ?? pdfMakeModule) as PdfMakeType;

      // Convertimos pdfFontsModule a un objeto con tipado más seguro
      const pdfFontsUnknown = pdfFontsModule as unknown;
      const pdfFontsRecord: Record<string, unknown> = pdfFontsUnknown as Record<string, unknown>;

      pdfMakeObj.vfs =
        (pdfFontsRecord.default as { pdfMake?: { vfs?: unknown } })?.pdfMake?.vfs ||
        (pdfFontsRecord.pdfMake as { vfs?: unknown })?.vfs;

      setPdfMake(pdfMakeObj);
    }
    loadPdfMake();
  }, []);

  // Exportar a Excel
  const exportToExcel = () => {
    const worksheetData = fichajes.map((f) => ({
      ID: f.id,
      EmpresaID: f.empresaId,
      Empleado: f.fullName,
      Obra: f.obra,
      Entrada: new Date(f.startTime).toLocaleString(),
      Salida: f.endTime ? new Date(f.endTime).toLocaleString() : "—",
      "Duración (hrs)": f.duracion != null ? f.duracion.toFixed(2) : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fichajes");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "fichajes.xlsx");
  };

  // Exportar a PDF
  const exportToPDF = () => {
    if (!pdfMake) return;

    const body = [
      ["ID", "EmpresaID", "Empleado", "Obra", "Entrada", "Salida", "Duración (hrs)"],
    ];

    fichajes.forEach((f) => {
      body.push([
        f.id,
        f.empresaId,
        f.fullName,
        f.obra,
        new Date(f.startTime).toLocaleString(),
        f.endTime ? new Date(f.endTime).toLocaleString() : "—",
        f.duracion != null ? f.duracion.toFixed(2) : "",
      ]);
    });

    // Definimos docDefinition con un tipado más seguro
    const docDefinition: Record<string, unknown> = {
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
