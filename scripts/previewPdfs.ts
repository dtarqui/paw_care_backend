/**
 * Genera los PDF de comprobante y carnet con datos inventados, en todos los tamaños
 * de papel, para revisarlos a ojo sin tocar la base ni depender de qué haya sembrado.
 *
 * Uso: `npx ts-node --transpile-only scripts/previewPdfs.ts <carpeta-destino>`
 */
import fs from "node:fs";
import path from "node:path";
import { buildReceiptPdf } from "../src/lib/receiptPdf";
import { buildVaccinationCardPdf } from "../src/lib/vaccinationCardPdf";
import { PaymentReceipt, VaccinationCard } from "../src/types";
import { labelsFor, LANGUAGES } from "../src/utils/labels";
import { PAPER_SIZES } from "../src/utils/paperSize";

const receipt: PaymentReceipt = {
  id: 42,
  receiptNumber: "R-2026-000042",
  date: "2026-08-28T10:15",
  method: "CASH",
  amount: 350.5,
  pet: { id: 1, name: "Luna", species: "Perro" },
  owner: {
    id: 1,
    firstName: "Roberto",
    paternalLastName: "Vargas Quispe",
    nationalId: "5551001",
    phone: "70011122",
  },
  visit: {
    id: 7,
    serviceType: "Cirugía",
    diagnosis: "Esterilización programada",
    date: "2026-08-28T09:00",
  },
  vet: { firstName: "Patricia", paternalLastName: "Mendoza" },
};

/** Historial largo y con una dosis vencida: es el caso que hay que mirar, no el de
 * una sola fila que se ve bien siempre. */
const card: VaccinationCard = {
  pet: {
    id: 1,
    name: "Luna",
    species: "Perro",
    breed: "Labrador Retriever",
    sex: "Hembra",
    birthDate: "2023-03-10",
  },
  owner: {
    firstName: "Roberto",
    paternalLastName: "Vargas Quispe",
    nationalId: "5551001",
    phone: "70011122",
  },
  controls: [
    { type: "VACCINE", appliedOn: "2023-05-02", nextDoseOn: "2024-05-02", overdue: false },
    { type: "DEWORMING", appliedOn: "2023-08-14", nextDoseOn: "2024-02-14", overdue: false },
    { type: "VACCINE", appliedOn: "2024-05-06", nextDoseOn: "2025-05-06", overdue: false },
    { type: "DEWORMING", appliedOn: "2024-11-20", nextDoseOn: "2025-05-20", overdue: true },
    { type: "VACCINE", appliedOn: "2025-05-09", nextDoseOn: "2026-05-09", overdue: true },
    { type: "DEWORMING", appliedOn: "2026-02-01", nextDoseOn: "", overdue: false },
    { type: "VACCINE", appliedOn: "2026-06-15", nextDoseOn: "2027-06-15", overdue: false },
  ],
};

const outDir = process.argv[2] ?? "pdf-preview";
fs.mkdirSync(outDir, { recursive: true });

for (const language of LANGUAGES) {
  const label = labelsFor(language);
  for (const paper of PAPER_SIZES) {
    for (const [name, doc] of [
      ["recibo", buildReceiptPdf(receipt, label, language, paper)],
      ["carnet", buildVaccinationCardPdf(card, label, language, paper)],
    ] as const) {
      const file = path.join(outDir, `${name}-${language}-${paper}.pdf`);
      doc.pipe(fs.createWriteStream(file));
      doc.end();
    }
  }
}

console.log(`PDFs de muestra en ${path.resolve(outDir)}`);
