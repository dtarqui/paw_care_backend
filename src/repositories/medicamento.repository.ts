import { prisma } from "../lib/prisma";
import { Medicamento, TipoMovimientoInventario } from "../types";

type MedicamentoRow = NonNullable<Awaited<ReturnType<typeof prisma.medicamento.findUnique>>>;

function aDominio(row: MedicamentoRow): Medicamento {
  return { id: row.id, nombre: row.nombre, stockActual: row.stockActual, stockMinimo: row.stockMinimo };
}

export interface NuevoMovimientoRegistro {
  medicamentoId: number;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  atencionId?: number;
}

export interface NuevoMedicamentoRegistro {
  nombre: string;
  stockMinimo: number;
  stockActual?: number;
}

export interface CambiosMedicamento {
  nombre?: string;
  stockMinimo?: number;
}

export const medicamentoRepository = {
  async findByNombre(nombre: string): Promise<Medicamento | undefined> {
    const row = await prisma.medicamento.findUnique({ where: { nombre } });
    return row ? aDominio(row) : undefined;
  },

  async create(input: NuevoMedicamentoRegistro): Promise<Medicamento> {
    const row = await prisma.medicamento.create({
      data: { nombre: input.nombre, stockMinimo: input.stockMinimo, stockActual: input.stockActual ?? 0 },
    });
    return aDominio(row);
  },

  async actualizar(id: number, cambios: CambiosMedicamento): Promise<Medicamento> {
    const row = await prisma.medicamento.update({ where: { id }, data: cambios });
    return aDominio(row);
  },

  async tieneMovimientos(id: number): Promise<boolean> {
    const row = await prisma.movimientoInventario.findFirst({ where: { medicamentoId: id } });
    return !!row;
  },

  async eliminar(id: number): Promise<void> {
    await prisma.medicamento.delete({ where: { id } });
  },

  async findAll(): Promise<Medicamento[]> {
    const rows = await prisma.medicamento.findMany({ orderBy: { nombre: "asc" } });
    return rows.map(aDominio);
  },

  async findById(id: number): Promise<Medicamento | undefined> {
    const row = await prisma.medicamento.findUnique({ where: { id } });
    return row ? aDominio(row) : undefined;
  },

  async findBajoStock(): Promise<Medicamento[]> {
    // Prisma no permite comparar dos columnas entre sí en el `where`; el catálogo es
    // chico así que se filtra en memoria en vez de usar $queryRaw.
    const rows = await prisma.medicamento.findMany({ orderBy: { nombre: "asc" } });
    return rows.filter((r) => r.stockActual <= r.stockMinimo).map(aDominio);
  },

  async ajustarStock(id: number, delta: number): Promise<void> {
    await prisma.medicamento.update({ where: { id }, data: { stockActual: { increment: delta } } });
  },

  async registrarMovimiento(input: NuevoMovimientoRegistro): Promise<void> {
    await prisma.movimientoInventario.create({
      data: {
        medicamentoId: input.medicamentoId,
        tipo: input.tipo,
        cantidad: input.cantidad,
        atencionId: input.atencionId ?? null,
      },
    });
  },
};
