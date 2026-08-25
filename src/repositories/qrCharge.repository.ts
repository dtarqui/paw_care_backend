import { prisma } from "../lib/prisma";
import { QrCharge, QrChargeStatus } from "../types";
import { dateToLiteral } from "../utils/date";

type QrChargeRow = NonNullable<Awaited<ReturnType<typeof prisma.qrCharge.findUnique>>>;

function toDomain(row: QrChargeRow): QrCharge {
  return {
    id: row.id,
    visitId: row.visitId,
    amount: Number(row.amount),
    status: row.status,
    provider: row.provider,
    qrPayload: row.qrPayload ?? undefined,
    expiresAt: row.expiresAt ? dateToLiteral(row.expiresAt) : undefined,
    confirmedAt: row.confirmedAt ? dateToLiteral(row.confirmedAt) : undefined,
    createdAt: dateToLiteral(row.createdAt),
  };
}

export interface NewQrCharge {
  visitId: number;
  amount: number;
  provider: string;
  externalReference: string;
  qrPayload: string;
  expiresAt: Date;
}

export const qrChargeRepository = {
  async create(input: NewQrCharge): Promise<QrCharge> {
    const row = await prisma.qrCharge.create({ data: input });
    return toDomain(row);
  },

  async findById(id: number): Promise<QrCharge | undefined> {
    const row = await prisma.qrCharge.findUnique({ where: { id } });
    return row ? toDomain(row) : undefined;
  },

  async findByExternalReference(externalReference: string): Promise<QrCharge | undefined> {
    const row = await prisma.qrCharge.findUnique({ where: { externalReference } });
    return row ? toDomain(row) : undefined;
  },

  async updateStatus(id: number, status: QrChargeStatus): Promise<QrCharge> {
    const row = await prisma.qrCharge.update({
      where: { id },
      data: { status, confirmedAt: status === "CONFIRMED" ? new Date() : undefined },
    });
    return toDomain(row);
  },
};
