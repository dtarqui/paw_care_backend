import { prisma } from "../lib/prisma";
import { PaymentHistoryEntry, PaymentMethod, PendingPayment } from "../types";
import { dateToLiteral } from "../utils/date";

export interface PaymentRecord {
  id: number;
  visitId: number;
  method: PaymentMethod;
  amount: number;
  date: string;
}

type PaymentRow = NonNullable<Awaited<ReturnType<typeof prisma.payment.findUnique>>>;

function toDomain(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    visitId: row.visitId,
    method: row.method,
    amount: Number(row.amount),
    date: dateToLiteral(row.date),
  };
}

export interface NewPaymentRecord {
  visitId: number;
  method: PaymentMethod;
  amount: number;
}

export const paymentRepository = {
  async findPending(): Promise<PendingPayment[]> {
    const visits = await prisma.medicalVisit.findMany({
      where: { paymentStatus: "PENDING" },
      include: { pet: { include: { owner: true } } },
      orderBy: { date: "asc" },
    });
    return visits.map((visit) => ({
      visitId: visit.id,
      pet: { id: visit.pet.id, name: visit.pet.name },
      owner: {
        id: visit.pet.owner.id,
        firstName: visit.pet.owner.firstName,
        paternalLastName: visit.pet.owner.paternalLastName,
      },
      consultationReason: visit.diagnosis,
      amount: Number(visit.consultationFee),
      date: dateToLiteral(visit.date),
    }));
  },

  async findAllRaw(): Promise<PaymentRecord[]> {
    const rows = await prisma.payment.findMany({ orderBy: { date: "desc" } });
    return rows.map(toDomain);
  },

  async findRecent(limit: number): Promise<PaymentHistoryEntry[]> {
    const rows = await prisma.payment.findMany({
      orderBy: { date: "desc" },
      take: limit,
      include: { visit: { include: { pet: { include: { owner: true } } } } },
    });
    return rows.map((row) => ({
      id: row.id,
      visitId: row.visitId,
      pet: { id: row.visit.pet.id, name: row.visit.pet.name },
      owner: {
        id: row.visit.pet.owner.id,
        firstName: row.visit.pet.owner.firstName,
        paternalLastName: row.visit.pet.owner.paternalLastName,
      },
      method: row.method,
      amount: Number(row.amount),
      date: dateToLiteral(row.date),
    }));
  },

  async register(input: NewPaymentRecord): Promise<PaymentRecord> {
    const row = await prisma.payment.create({ data: input });
    return toDomain(row);
  },
};
