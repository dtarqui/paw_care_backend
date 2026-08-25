import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Appointment, AppointmentStatus, Paginated } from "../types";
import { dateToLiteral, literalToDate } from "../utils/date";

const include = {
  pet: { select: { id: true, name: true, species: true } },
  vet: { include: { user: { select: { firstName: true, paternalLastName: true } } } },
} satisfies Prisma.AppointmentInclude;
type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof include }>;

function toDomain(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    code: row.code,
    dateTime: dateToLiteral(row.dateTime),
    durationMin: row.durationMin,
    pet: { id: row.pet.id, name: row.pet.name, species: row.pet.species },
    vet: {
      id: row.vetId,
      firstName: row.vet.user.firstName,
      paternalLastName: row.vet.user.paternalLastName,
    },
    consultationType: row.consultationType,
    reason: row.reason ?? "",
    status: row.status,
  };
}

export interface NewAppointmentRecord {
  code: string;
  dateTime: string; // literal "YYYY-MM-DDTHH:mm"
  durationMin: number;
  petId: number;
  vetId: number;
  consultationType: string;
  reason: string;
}

export const appointmentRepository = {
  async findAll(): Promise<Appointment[]> {
    const rows = await prisma.appointment.findMany({ include, orderBy: { dateTime: "asc" } });
    return rows.map(toDomain);
  },

  async findAllPaginated(page: number, pageSize: number): Promise<Paginated<Appointment>> {
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({
        include,
        orderBy: { dateTime: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appointment.count(),
    ]);
    return { items: rows.map(toDomain), total, page, pageSize };
  },

  async findById(id: number): Promise<Appointment | undefined> {
    const row = await prisma.appointment.findUnique({ where: { id }, include });
    return row ? toDomain(row) : undefined;
  },

  async findByPetId(petId: number): Promise<Appointment[]> {
    const rows = await prisma.appointment.findMany({ where: { petId }, include, orderBy: { dateTime: "desc" } });
    return rows.map(toDomain);
  },

  async findBookedSlotsByVetAndDate(
    vetId: number,
    isoDate: string,
    excludeAppointmentId?: number
  ): Promise<string[]> {
    const start = literalToDate(isoDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const rows = await prisma.appointment.findMany({
      where: {
        vetId,
        dateTime: { gte: start, lt: end },
        status: { not: "CANCELLED" },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { dateTime: true },
    });
    return rows.map((r) => dateToLiteral(r.dateTime).slice(11, 16));
  },

  /** Cuenta citas cuyo código contiene el prefijo YYYYMMDD, para numerar la
   * secuencia diaria (ver appointment.service.ts). */
  async countByCodeFragment(yyyymmdd: string): Promise<number> {
    return prisma.appointment.count({ where: { code: { contains: yyyymmdd } } });
  },

  async create(input: NewAppointmentRecord): Promise<Appointment> {
    const row = await prisma.appointment.create({
      data: {
        code: input.code,
        dateTime: literalToDate(input.dateTime),
        durationMin: input.durationMin,
        petId: input.petId,
        vetId: input.vetId,
        consultationType: input.consultationType,
        reason: input.reason || null,
        status: "CONFIRMED",
      },
      include,
    });
    return toDomain(row);
  },

  async updateStatus(id: number, status: AppointmentStatus): Promise<Appointment> {
    const row = await prisma.appointment.update({ where: { id }, data: { status }, include });
    return toDomain(row);
  },

  async reschedule(id: number, dateTimeLiteral: string): Promise<Appointment> {
    const row = await prisma.appointment.update({
      where: { id },
      data: { dateTime: literalToDate(dateTimeLiteral) },
      include,
    });
    return toDomain(row);
  },
};
