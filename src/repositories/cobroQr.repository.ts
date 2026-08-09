import { prisma } from "../lib/prisma";
import { CobroQr, EstadoCobroQr } from "../types";
import { dateToLiteral } from "../utils/date";

type CobroQrRow = NonNullable<Awaited<ReturnType<typeof prisma.cobroQr.findUnique>>>;

function aDominio(row: CobroQrRow): CobroQr {
  return {
    id: row.id,
    atencionId: row.atencionId,
    monto: Number(row.monto),
    estado: row.estado,
    proveedor: row.proveedor,
    qrPayload: row.qrPayload ?? undefined,
    expiraEn: row.expiraEn ? dateToLiteral(row.expiraEn) : undefined,
    confirmadoEn: row.confirmadoEn ? dateToLiteral(row.confirmadoEn) : undefined,
    createdAt: dateToLiteral(row.createdAt),
  };
}

export interface NuevoCobroQr {
  atencionId: number;
  monto: number;
  proveedor: string;
  referenciaExterna: string;
  qrPayload: string;
  expiraEn: Date;
}

export const cobroQrRepository = {
  async crear(input: NuevoCobroQr): Promise<CobroQr> {
    const row = await prisma.cobroQr.create({ data: input });
    return aDominio(row);
  },

  async findById(id: number): Promise<CobroQr | undefined> {
    const row = await prisma.cobroQr.findUnique({ where: { id } });
    return row ? aDominio(row) : undefined;
  },

  async findByReferenciaExterna(referenciaExterna: string): Promise<CobroQr | undefined> {
    const row = await prisma.cobroQr.findUnique({ where: { referenciaExterna } });
    return row ? aDominio(row) : undefined;
  },

  async actualizarEstado(id: number, estado: EstadoCobroQr): Promise<CobroQr> {
    const row = await prisma.cobroQr.update({
      where: { id },
      data: { estado, confirmadoEn: estado === "CONFIRMADO" ? new Date() : undefined },
    });
    return aDominio(row);
  },
};
