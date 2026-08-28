import { prisma } from "../lib/prisma";
import { PreventiveControlType, VaccinationCard } from "../types";
import { dateOnlyToLiteral, literalDateOnlyToDate, todayISO } from "../utils/date";

export interface PreventiveControlRecord {
  id: number;
  petId: number;
  type: PreventiveControlType;
  appliedOn: string; // YYYY-MM-DD
  nextDoseOn: string; // YYYY-MM-DD
}

type PreventiveControlRow = NonNullable<Awaited<ReturnType<typeof prisma.preventiveControl.findUnique>>>;

function toDomain(row: PreventiveControlRow): PreventiveControlRecord {
  return {
    id: row.id,
    petId: row.petId,
    type: row.type,
    appliedOn: dateOnlyToLiteral(row.appliedOn),
    nextDoseOn: row.nextDoseOn ? dateOnlyToLiteral(row.nextDoseOn) : "",
  };
}

export interface NewPreventiveControlRecord {
  petId: number;
  type: PreventiveControlType;
  appliedOn: string;
  nextDoseOn?: string;
}

export const preventiveControlRepository = {
  async findByPetId(petId: number): Promise<PreventiveControlRecord[]> {
    const rows = await prisma.preventiveControl.findMany({ where: { petId }, orderBy: { nextDoseOn: "desc" } });
    return rows.map(toDomain);
  },

  async findAll(): Promise<PreventiveControlRecord[]> {
    const rows = await prisma.preventiveControl.findMany();
    return rows.map(toDomain);
  },

  async findById(id: number): Promise<PreventiveControlRecord | undefined> {
    const row = await prisma.preventiveControl.findUnique({ where: { id } });
    return row ? toDomain(row) : undefined;
  },

  /** Los datos del carnet: mascota + propietario + todos sus controles, en una sola
   * consulta. Devuelve null si la mascota no existe. */
  async findVaccinationCard(petId: number): Promise<VaccinationCard | null> {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: true,
        preventiveControls: { orderBy: { appliedOn: "asc" } },
      },
    });
    if (!pet) return null;

    const today = todayISO();
    return {
      pet: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed ?? "",
        sex: (pet.sex ?? "") as VaccinationCard["pet"]["sex"],
        birthDate: pet.birthDate ? dateOnlyToLiteral(pet.birthDate) : "",
      },
      owner: {
        firstName: pet.owner.firstName,
        paternalLastName: pet.owner.paternalLastName,
        nationalId: pet.owner.nationalId,
        phone: pet.owner.phone ?? undefined,
      },
      controls: pet.preventiveControls.map((control) => {
        const nextDoseOn = control.nextDoseOn ? dateOnlyToLiteral(control.nextDoseOn) : "";
        return {
          type: control.type,
          appliedOn: dateOnlyToLiteral(control.appliedOn),
          nextDoseOn,
          // Sin próxima dosis no hay nada que vencer: se deja en falso, igual que en
          // el panel de "próximos a vencer".
          overdue: nextDoseOn !== "" && nextDoseOn < today,
        };
      }),
    };
  },

  async create(input: NewPreventiveControlRecord): Promise<PreventiveControlRecord> {
    const row = await prisma.preventiveControl.create({
      data: {
        petId: input.petId,
        type: input.type,
        appliedOn: literalDateOnlyToDate(input.appliedOn),
        nextDoseOn: input.nextDoseOn ? literalDateOnlyToDate(input.nextDoseOn) : null,
      },
    });
    return toDomain(row);
  },
};
