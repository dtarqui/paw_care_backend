import { prisma } from "../lib/prisma";
import { VisitPaymentStatus } from "../types";
import { dateToLiteral } from "../utils/date";

export interface VisitRecord {
  id: number;
  petId: number;
  vetId: number;
  date: string; // literal "YYYY-MM-DDTHH:mm"
  serviceType: string;
  diagnosis: string;
  treatment: string;
  externalExams: string;
  weight?: number;
  consultationFee: number;
  paymentStatus: VisitPaymentStatus;
}

type VisitRow = NonNullable<Awaited<ReturnType<typeof prisma.medicalVisit.findUnique>>>;

function toDomain(row: VisitRow): VisitRecord {
  return {
    id: row.id,
    petId: row.petId,
    vetId: row.vetId,
    date: dateToLiteral(row.date),
    serviceType: row.serviceType,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    externalExams: row.externalExams ?? "",
    weight: row.weight ? Number(row.weight) : undefined,
    consultationFee: Number(row.consultationFee),
    paymentStatus: row.paymentStatus,
  };
}

export interface NewVisitRecord {
  petId: number;
  vetId: number;
  serviceType: string;
  diagnosis: string;
  treatment: string;
  externalExams: string;
  weight?: number;
  consultationFee: number;
}

export const medicalVisitRepository = {
  async findAll(): Promise<VisitRecord[]> {
    const rows = await prisma.medicalVisit.findMany({ orderBy: { date: "desc" } });
    return rows.map(toDomain);
  },

  async findByPetId(petId: number): Promise<VisitRecord[]> {
    const rows = await prisma.medicalVisit.findMany({ where: { petId }, orderBy: { date: "desc" } });
    return rows.map(toDomain);
  },

  async findById(id: number): Promise<VisitRecord | undefined> {
    const row = await prisma.medicalVisit.findUnique({ where: { id } });
    return row ? toDomain(row) : undefined;
  },

  async findPending(): Promise<VisitRecord[]> {
    const rows = await prisma.medicalVisit.findMany({ where: { paymentStatus: "PENDING" } });
    return rows.map(toDomain);
  },

  async markAsPaid(id: number): Promise<void> {
    await prisma.medicalVisit.update({ where: { id }, data: { paymentStatus: "PAID" } });
  },

  async create(input: NewVisitRecord): Promise<VisitRecord> {
    const row = await prisma.medicalVisit.create({ data: { ...input, paymentStatus: "PENDING" } });
    return toDomain(row);
  },
};
