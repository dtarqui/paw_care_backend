import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PaymentHistoryEntry, PaymentMethod, PaymentReceipt, PendingPayment } from "../types";
import { dateToLiteral } from "../utils/date";
import { receiptNumber } from "../utils/receiptNumber";

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

/** Todo lo que el comprobante necesita colgando del pago. */
const RECEIPT_INCLUDE = {
  visit: {
    include: {
      pet: { include: { owner: true } },
      vet: { include: { user: true } },
    },
  },
} as const;

type ReceiptRow = Prisma.PaymentGetPayload<{ include: typeof RECEIPT_INCLUDE }>;

function toReceipt(row: ReceiptRow): PaymentReceipt {
  const date = dateToLiteral(row.date);
  return {
    id: row.id,
    receiptNumber: receiptNumber(row.id, date),
    date,
    method: row.method,
    amount: Number(row.amount),
    pet: { id: row.visit.pet.id, name: row.visit.pet.name, species: row.visit.pet.species },
    owner: {
      id: row.visit.pet.owner.id,
      firstName: row.visit.pet.owner.firstName,
      paternalLastName: row.visit.pet.owner.paternalLastName,
      nationalId: row.visit.pet.owner.nationalId,
      phone: row.visit.pet.owner.phone ?? undefined,
    },
    visit: {
      id: row.visit.id,
      serviceType: row.visit.serviceType,
      diagnosis: row.visit.diagnosis,
      date: dateToLiteral(row.visit.date),
    },
    vet: {
      firstName: row.visit.vet.user.firstName,
      paternalLastName: row.visit.vet.user.paternalLastName,
    },
  };
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
      receiptNumber: receiptNumber(row.id, dateToLiteral(row.date)),
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

  /** Crea el pago y devuelve ya el comprobante: el `include` va en el mismo `create`,
   * así no hay una segunda consulta que pueda no encontrar lo que se acaba de crear. */
  async register(input: NewPaymentRecord): Promise<PaymentReceipt> {
    const row = await prisma.payment.create({ data: input, include: RECEIPT_INCLUDE });
    return toReceipt(row);
  },

  async findReceipt(id: number): Promise<PaymentReceipt | null> {
    const row = await prisma.payment.findUnique({ where: { id }, include: RECEIPT_INCLUDE });
    return row ? toReceipt(row) : null;
  },
};
