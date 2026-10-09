"use client";
import { exportJSON, exportExcel, exportPDF, PredictionRecord } from "@/lib/exporters";

export default function ExportButtons({
  records, label,
}: { records: PredictionRecord[]; label: string }) {
  const disabled = records.length === 0;
  const cls =
    "rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium " +
    "hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={cls} disabled={disabled}
              onClick={() => exportJSON(records, label)}>↓ JSON</button>
      <button type="button" className={cls} disabled={disabled}
              onClick={() => exportExcel(records, label)}>↓ Excel</button>
      <button type="button" className={cls} disabled={disabled}
              onClick={() => exportPDF(records, label)}>↓ PDF</button>
    </div>
  );
}