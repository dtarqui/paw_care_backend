import ExcelJS from "exceljs";
import { mascotaRepository } from "../repositories/mascota.repository";
import { propietarioRepository } from "../repositories/propietario.repository";

export class DatosDeImportacionInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeImportacionInvalidosError";
  }
}

export interface FilaConError {
  fila: number;
  motivo: string;
}

export interface ResultadoImportacion {
  importados: number;
  errores: FilaConError[];
}

// Orden de columnas esperado (fila 1 = encabezado, se ignora):
// A nombre | B apellidoPaterno | C apellidoMaterno | D ci | E telefono | F direccion | G mascotaNombre | H mascotaEspecie | I mascotaRaza
export const importacionService = {
  async importarClientes(buffer: Buffer): Promise<ResultadoImportacion> {
    const workbook = new ExcelJS.Workbook();
    try {
      // Cast pragmático: choque de tipos entre el Buffer de Node y el que espera
      // exceljs internamente (ArrayBufferLike vs ArrayBuffer) — el contenido es compatible en runtime.
      await workbook.xlsx.load(buffer as never);
    } catch {
      throw new DatosDeImportacionInvalidosError("El archivo no es un Excel (.xlsx) válido");
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new DatosDeImportacionInvalidosError("El archivo no tiene ninguna hoja");
    }

    const filas: { numeroFila: number; valores: unknown[] }[] = [];
    sheet.eachRow((row, numeroFila) => {
      if (numeroFila === 1) return; // encabezado
      filas.push({ numeroFila, valores: row.values as unknown[] });
    });

    const errores: FilaConError[] = [];
    let importados = 0;

    for (const { numeroFila, valores } of filas) {
      const nombre = valores[1] ? String(valores[1]).trim() : "";
      const apellidoPaterno = valores[2] ? String(valores[2]).trim() : "";
      const ci = valores[4] ? String(valores[4]).trim() : "";
      const telefono = valores[5] ? String(valores[5]).trim() : "";
      const mascotaNombre = valores[7] ? String(valores[7]).trim() : "";
      const mascotaEspecie = valores[8] ? String(valores[8]).trim() : "";
      const mascotaRaza = valores[9] ? String(valores[9]).trim() : "";

      if (!nombre || !apellidoPaterno || !ci || !mascotaNombre || !mascotaEspecie) {
        errores.push({
          fila: numeroFila,
          motivo: "Faltan campos obligatorios (nombre, apellido paterno, CI, mascota, especie)",
        });
        continue;
      }

      let propietario = await propietarioRepository.findByCi(ci);
      if (!propietario) {
        propietario = await propietarioRepository.create({ nombre, apellidoPaterno, ci, telefono });
      }

      if (await mascotaRepository.existeParaPropietario(propietario.id, mascotaNombre, mascotaEspecie)) {
        errores.push({ fila: numeroFila, motivo: `La mascota "${mascotaNombre}" ya existe para este propietario` });
        continue;
      }

      await mascotaRepository.create({
        propietarioId: propietario.id,
        nombre: mascotaNombre,
        especie: mascotaEspecie,
        raza: mascotaRaza,
        sexo: "Macho",
      });
      importados++;
    }

    return { importados, errores };
  },
};
