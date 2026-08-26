import { medicalVisitRepository } from "../repositories/medicalVisit.repository";
import { paymentRepository } from "../repositories/payment.repository";
import { petRepository } from "../repositories/pet.repository";
import { vetRepository } from "../repositories/vet.repository";
import { PaymentMethod, VisitPaymentStatus } from "../types";

export interface ReportFilters {
  from?: string;
  to?: string;
  serviceType?: string;
  paymentMethod?: PaymentMethod;
}

export interface PaymentDetail {
  id: number;
  visitId: number;
  method: PaymentMethod;
  amount: number;
  date: string;
  serviceType: string;
  pet: string;
  owner: string;
}

export interface VisitSummary {
  id: number;
  date: string;
  pet: string;
  owner: string;
  vet: string;
  serviceType: string;
  consultationFee: number;
  paymentStatus: VisitPaymentStatus;
}

export interface ServiceTypeGroup {
  serviceType: string;
  count: number;
  amount: number;
}

function withinRange(isoDate: string, from?: string, to?: string): boolean {
  const date = isoDate.slice(0, 10);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

async function detailedPayments(): Promise<PaymentDetail[]> {
  const payments = await paymentRepository.findAllRaw();
  return Promise.all(
    payments.map(async (payment) => {
      const visit = (await medicalVisitRepository.findById(payment.visitId))!;
      const pet = (await petRepository.findById(visit.petId))!;
      return {
        id: payment.id,
        visitId: payment.visitId,
        method: payment.method,
        amount: payment.amount,
        date: payment.date,
        serviceType: visit.serviceType,
        pet: pet.name,
        owner: `${pet.owner.firstName} ${pet.owner.paternalLastName}`,
      };
    })
  );
}

export const reportService = {
  /** HU7 — reporte de ingresos con filtros y totales. */
  async revenue(filters: ReportFilters) {
    let payments = (await detailedPayments()).filter((p) => withinRange(p.date, filters.from, filters.to));
    if (filters.serviceType) payments = payments.filter((p) => p.serviceType === filters.serviceType);
    if (filters.paymentMethod) payments = payments.filter((p) => p.method === filters.paymentMethod);

    return {
      payments,
      totals: { count: payments.length, amount: payments.reduce((sum, p) => sum + p.amount, 0) },
    };
  },

  /** HU8 — listado de atenciones por período. */
  async visitsByPeriod(filters: ReportFilters): Promise<VisitSummary[]> {
    const visits = (await medicalVisitRepository.findAll()).filter((v) =>
      withinRange(v.date, filters.from, filters.to)
    );
    return Promise.all(
      visits.map(async (v) => {
        const pet = (await petRepository.findById(v.petId))!;
        const vet = await vetRepository.findById(v.vetId);
        return {
          id: v.id,
          date: v.date,
          pet: pet.name,
          owner: `${pet.owner.firstName} ${pet.owner.paternalLastName}`,
          vet: vet ? `${vet.firstName} ${vet.paternalLastName}` : "",
          serviceType: v.serviceType,
          consultationFee: v.consultationFee,
          paymentStatus: v.paymentStatus,
        };
      })
    );
  },

  /** HU8 — ingresos agrupados por tipo de servicio, para el gráfico. */
  async revenueByServiceType(filters: ReportFilters): Promise<ServiceTypeGroup[]> {
    const payments = (await detailedPayments()).filter((p) => withinRange(p.date, filters.from, filters.to));
    const groups = new Map<string, ServiceTypeGroup>();
    for (const payment of payments) {
      const group = groups.get(payment.serviceType) ?? {
        serviceType: payment.serviceType,
        count: 0,
        amount: 0,
      };
      group.count += 1;
      group.amount += payment.amount;
      groups.set(payment.serviceType, group);
    }
    return [...groups.values()].sort((a, b) => b.amount - a.amount);
  },
};
