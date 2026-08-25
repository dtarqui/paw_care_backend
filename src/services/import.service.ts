import ExcelJS from "exceljs";
import { ownerRepository } from "../repositories/owner.repository";
import { petRepository } from "../repositories/pet.repository";

export class InvalidImportDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImportDataError";
  }
}

export interface RowWithError {
  row: number;
  reason: string; // texto visible para el usuario — en español
}

export interface ImportResult {
  imported: number;
  errors: RowWithError[];
}

// Orden de columnas esperado (fila 1 = encabezado, se ignora):
// A nombre | B apellidoPaterno | C apellidoMaterno | D ci | E telefono | F direccion | G mascotaNombre | H mascotaEspecie | I mascotaRaza
export const importService = {
  async importClients(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    try {
      // Cast pragmático: choque de tipos entre el Buffer de Node y el que espera
      // exceljs internamente (ArrayBufferLike vs ArrayBuffer) — el contenido es compatible en runtime.
      await workbook.xlsx.load(buffer as never);
    } catch {
      throw new InvalidImportDataError("El archivo no es un Excel (.xlsx) válido");
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new InvalidImportDataError("El archivo no tiene ninguna hoja");
    }

    const rows: { rowNumber: number; values: unknown[] }[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // encabezado
      rows.push({ rowNumber, values: row.values as unknown[] });
    });

    const errors: RowWithError[] = [];
    let imported = 0;

    for (const { rowNumber, values } of rows) {
      const firstName = values[1] ? String(values[1]).trim() : "";
      const paternalLastName = values[2] ? String(values[2]).trim() : "";
      const nationalId = values[4] ? String(values[4]).trim() : "";
      const phone = values[5] ? String(values[5]).trim() : "";
      const petName = values[7] ? String(values[7]).trim() : "";
      const petSpecies = values[8] ? String(values[8]).trim() : "";
      const petBreed = values[9] ? String(values[9]).trim() : "";

      if (!firstName || !paternalLastName || !nationalId || !petName || !petSpecies) {
        errors.push({
          row: rowNumber,
          reason: "Faltan campos obligatorios (nombre, apellido paterno, CI, mascota, especie)",
        });
        continue;
      }

      let owner = await ownerRepository.findByNationalId(nationalId);
      if (!owner) {
        owner = await ownerRepository.create({ firstName, paternalLastName, nationalId, phone });
      }

      if (await petRepository.existsForOwner(owner.id, petName, petSpecies)) {
        errors.push({ row: rowNumber, reason: `La mascota "${petName}" ya existe para este propietario` });
        continue;
      }

      await petRepository.create({
        ownerId: owner.id,
        name: petName,
        species: petSpecies,
        breed: petBreed,
        sex: "Macho",
      });
      imported++;
    }

    return { imported, errors };
  },
};
