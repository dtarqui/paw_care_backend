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

function fakePetWithControls(
  controls: {
    type: string;
    appliedOn: string;
    nextDoseOn: string | null;
    productName?: string;
    batchNumber?: string;
  }[]
) {
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
      productName: control.productName ?? null,
      batchNumber: control.batchNumber ?? null,
      appliedOn: utcDate(control.appliedOn),
      nextDoseOn: control.nextDoseOn ? utcDate(control.nextDoseOn) : null,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** La mascota tal como la devuelve `petRepository.findById` (con su propietario). */
function fakePet() {
  return {
    id: 1,
    ownerId: 1,
    name: "Luna",
    species: "Perro",
    breed: "Labrador",
    color: null,
    sex: "Hembra",
    birthDate: utcDate("2023-03-10"),
    weight: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: 1,
      firstName: "Roberto",
      paternalLastName: "Vargas",
      maternalLastName: null,
      nationalId: "5551001",
      phone: "70011122",
      address: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** Lo que se mandó a `prisma.preventiveControl.create` en la última llamada. */
function created() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prismaMock.preventiveControl.create as any).mock.calls.at(-1)?.[0]?.data;
}

describe("preventiveControlService.create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.pet.findUnique.mockResolvedValue(fakePet());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaMock.preventiveControl.create as any).mockImplementation((args: any) =>
      Promise.resolve({ id: 1, nextDoseOn: null, createdAt: new Date(), ...args.data })
    );
  });

  it("guarda qué se aplicó y de qué lote", async () => {
    const control = await preventiveControlService.create({
      petId: 1,
      type: "VACCINE",
      productName: "Antirrábica",
      batchNumber: "A-2451",
      appliedOn: "2026-08-28",
    });

    expect(created()).toMatchObject({ productName: "Antirrábica", batchNumber: "A-2451" });
    expect(control.productName).toBe("Antirrábica");
    expect(control.batchNumber).toBe("A-2451");
  });

  it("un campo vacío se guarda como sin dato, no como cadena vacía", async () => {
    // El formulario manda "" cuando la clínica no anotó el lote: en la base eso es
    // ausencia de dato, y una cadena vacía haría que el carnet imprima un renglón en
    // blanco en vez de dejar la casilla libre para llenarla a mano.
    await preventiveControlService.create({
      petId: 1,
      type: "DEWORMING",
      productName: "   ",
      batchNumber: "",
      appliedOn: "2026-08-28",
    });

    expect(created()).toMatchObject({ productName: null, batchNumber: null });
  });
});

describe("preventiveControlService.vaccinationCard", () => {
  it("marca vencida solo la dosis con fecha pasada", async () => {
    prismaMock.pet.findUnique.mockResolvedValue(
      fakePetWithControls([
        {
          type: "VACCINE",
          appliedOn: "2023-05-02",
          nextDoseOn: "2023-11-02",
          productName: "Antirrábica",
          batchNumber: "A-2451",
        },
        { type: "DEWORMING", appliedOn: "2024-01-10", nextDoseOn: "2099-01-10" },
        { type: "VACCINE", appliedOn: "2024-06-01", nextDoseOn: null },
      ])
    );

    const card = await preventiveControlService.vaccinationCard(1);

    expect(card.pet.name).toBe("Luna");
    expect(card.pet.birthDate).toBe("2023-03-10");
    expect(card.owner.nationalId).toBe("5551001");
    expect(card.controls.map((c) => c.overdue)).toEqual([true, false, false]);
    expect(card.controls[0]).toMatchObject({ productName: "Antirrábica", batchNumber: "A-2451" });
    // Lo que la clínica no registró llega vacío, y el carnet deja esa casilla libre.
    expect(card.controls[1].productName).toBeUndefined();
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
