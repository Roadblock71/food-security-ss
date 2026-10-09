import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

export interface PredictionRecord {
  timestamp: string;
  state: string;
  county: string;
  period: string;
  population: number;
  priorPhase: string;
  priorPhase3Pct: number;
  productionTonnes: number;
  gapTonnes: number;
  probability: number;
  band: string;
}

const BAND_RGB: Record<string, [number, number, number]> = {
  "Low":       [16, 185, 129],
  "Moderate":  [234, 179, 8],
  "High":      [249, 115, 22],
  "Very High": [220, 38, 38],
};

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportJSON(records: PredictionRecord[], label = "predictions") {
  const payload = {
    generated_at: new Date().toISOString(),
    generator: "South Sudan Food Security Risk — IndabaX 2026",
    disclaimer: "This is an early-warning signal, not a replacement for IPC classification.",
    record_count: records.length,
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  saveAs(blob, `ss-food-risk-${stamp()}-${label}.json`);
}

export function exportExcel(records: PredictionRecord[], label = "predictions") {
  const rows = records.map((r) => ({
    Timestamp: r.timestamp,
    State: r.state,
    County: r.county,
    Period: r.period,
    Population: r.population,
    "Prior IPC Phase": r.priorPhase,
    "Prior Phase 3+ %": r.priorPhase3Pct,
    "Cereal Production (t)": r.productionTonnes,
    "Cereal Gap (t)": r.gapTonnes,
    "Risk Probability": r.probability,
    "Risk %": +(r.probability * 100).toFixed(2),
    "Risk Band": r.band,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 16 },
    { wch: 16 }, { wch: 10 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Predictions");
  XLSX.writeFile(wb, `ss-food-risk-${stamp()}-${label}.xlsx`);
}

export function exportPDF(records: PredictionRecord[], label = "predictions") {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text("South Sudan Food Security Risk Report", 40, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}   |   Records: ${records.length}`, 40, 65);
  doc.setFontSize(9);
  doc.text("IndabaX South Sudan 2026 — early-warning signal between formal IPC assessments", 40, 80);

  autoTable(doc, {
    startY: 100,
    head: [[
      "State", "County", "Period", "Prior Phase",
      "Phase 3+ %", "Pop.", "Prod. (t)", "Gap (t)", "Risk %", "Band",
    ]],
    body: records.map((r) => [
      r.state, r.county, r.period, r.priorPhase,
      r.priorPhase3Pct.toFixed(1),
      r.population.toLocaleString(),
      r.productionTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      r.gapTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      (r.probability * 100).toFixed(1),
      r.band,
    ]),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 9) {
        const rgb = BAND_RGB[data.cell.raw as string];
        if (rgb) {
          data.cell.styles.textColor = rgb;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "This is an early-warning signal, not a replacement for IPC classification.",
      40, doc.internal.pageSize.height - 25,
    );
    doc.text(
      `Page ${i} of ${total}`,
      doc.internal.pageSize.width - 80,
      doc.internal.pageSize.height - 25,
    );
  }
  doc.save(`ss-food-risk-${stamp()}-${label}.pdf`);
}