import { prisma } from "../lib/prisma";
import { MetodoPago, PagoHistorial, PagoPendiente } from "../types";
import { dateToLiteral } from "../utils/date";

export interface PagoRegistro {
  id: number;
  atencionId: number;
  metodoPago: MetodoPago;
  monto: number;
  fecha: string;
}

type PagoRow = NonNullable<Awaited<ReturnType<typeof prisma.pago.findUnique>>>;

function aDominio(row: PagoRow): PagoRegistro {
  return {
    id: row.id,
    atencionId: row.atencionId,
    metodoPago: row.metodoPago,
    monto: Number(row.monto),
    fecha: dateToLiteral(row.fecha),
  };
}

export interface NuevoPagoRegistro {
  atencionId: number;
  metodoPago: MetodoPago;
  monto: number;
}

export const pagoRepository = {
  async findPendientes(): Promise<PagoPendiente[]> {
    const atenciones = await prisma.atencionMedica.findMany({
      where: { estadoPago: "PENDIENTE" },
      include: { mascota: { include: { propietario: true } } },
      orderBy: { fecha: "asc" },
    });
    return atenciones.map((atencion) => ({
      atencionId: atencion.id,
      mascota: { id: atencion.mascota.id, nombre: atencion.mascota.nombre },
      propietario: {
        id: atencion.mascota.propietario.id,
        nombre: atencion.mascota.propietario.nombre,
        apellidoPaterno: atencion.mascota.propietario.apellidoPaterno,
      },
      motivoConsulta: atencion.diagnostico,
      monto: Number(atencion.montoConsulta),
      fecha: dateToLiteral(atencion.fecha),
    }));
  },

  async findAllRaw(): Promise<PagoRegistro[]> {
    const rows = await prisma.pago.findMany({ orderBy: { fecha: "desc" } });
    return rows.map(aDominio);
  },

  async findRecientes(limit: number): Promise<PagoHistorial[]> {
    const rows = await prisma.pago.findMany({
      orderBy: { fecha: "desc" },
      take: limit,
      include: { atencion: { include: { mascota: { include: { propietario: true } } } } },
    });
    return rows.map((row) => ({
      id: row.id,
      atencionId: row.atencionId,
      mascota: { id: row.atencion.mascota.id, nombre: row.atencion.mascota.nombre },
      propietario: {
        id: row.atencion.mascota.propietario.id,
        nombre: row.atencion.mascota.propietario.nombre,
        apellidoPaterno: row.atencion.mascota.propietario.apellidoPaterno,
      },
      metodoPago: row.metodoPago,
      monto: Number(row.monto),
      fecha: dateToLiteral(row.fecha),
    }));
  },

  async registrar(input: NuevoPagoRegistro): Promise<PagoRegistro> {
    const row = await prisma.pago.create({ data: input });
    return aDominio(row);
  },
};
