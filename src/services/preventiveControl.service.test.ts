import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { preventiveControlService, VaccinationCardNotFoundError } from "./preventiveControl.service";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

/** Las columnas de fecha del carnet son `@db.Date`: Prisma las devuelve a medianoche
 * UTC, y así hay que fabricarlas acá para que el mapeo sea el real. */
function utcDate(literal: string) {
  return new Date(`${literal}T00:00:00.000Z`);
}

function fakePetWithControls(controls: { type: string; appliedOn: string; nextDoseOn: string | null }[]) {
  return {
    id: 1,
    name: "Luna",
    species: "Perro",
    breed: "Labrador",
    sex: "Hembra",
    birthDate: utcDate("2023-03-10"),
    owner: {
      firstName: "Roberto",
      paternalLastName: "Vargas",
      nationalId: "5551001",
      phone: "70011122",
    },
    preventiveControls: controls.map((control, index) => ({
      id: index + 1,
      petId: 1,
      type: control.type,
      appliedOn: utcDate(control.appliedOn),
      nextDoseOn: control.nextDoseOn ? utcDate(control.nextDoseOn) : null,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("preventiveControlService.vaccinationCard", () => {
  it("marca vencida solo la dosis con fecha pasada", async () => {
    prismaMock.pet.findUnique.mockResolvedValue(
      fakePetWithControls([
        { type: "VACCINE", appliedOn: "2023-05-02", nextDoseOn: "2023-11-02" },
        { type: "DEWORMING", appliedOn: "2024-01-10", nextDoseOn: "2099-01-10" },
        { type: "VACCINE", appliedOn: "2024-06-01", nextDoseOn: null },
      ])
    );

    const card = await preventiveControlService.vaccinationCard(1);

    expect(card.pet.name).toBe("Luna");
    expect(card.pet.birthDate).toBe("2023-03-10");
    expect(card.owner.nationalId).toBe("5551001");
    expect(card.controls.map((c) => c.overdue)).toEqual([true, false, false]);
    // Sin próxima dosis no hay nada que vencer, aunque la aplicación sea vieja.
    expect(card.controls[2].nextDoseOn).toBe("");
  });

  it("una mascota sin dosis igual tiene carnet", async () => {
    prismaMock.pet.findUnique.mockResolvedValue(fakePetWithControls([]));

    const card = await preventiveControlService.vaccinationCard(1);

    expect(card.controls).toEqual([]);
  });

  it("una mascota inexistente no", async () => {
    prismaMock.pet.findUnique.mockResolvedValue(null);

    await expect(preventiveControlService.vaccinationCard(999)).rejects.toThrow(
      VaccinationCardNotFoundError
    );
  });
});
