import { appointmentRepository } from "../repositories/appointment.repository";
import { petRepository } from "../repositories/pet.repository";
import { vetRepository } from "../repositories/vet.repository";
import { ForeignScheduleError, ScheduleConflictError, appointmentService } from "./appointment.service";

jest.mock("../repositories/appointment.repository");
jest.mock("../repositories/pet.repository");
jest.mock("../repositories/vet.repository");

const appointmentRepoMock = appointmentRepository as jest.Mocked<typeof appointmentRepository>;
const petRepoMock = petRepository as jest.Mocked<typeof petRepository>;
const vetRepoMock = vetRepository as jest.Mocked<typeof vetRepository>;

const fakePet = {
  id: 1,
  name: "Coco",
  species: "Perro",
  breed: "",
  sex: "Macho" as const,
  birthDate: "",
  weight: 0,
  status: "ACTIVE" as const,
  owner: { id: 1, firstName: "Juan", paternalLastName: "Pérez", nationalId: "123", phone: "" },
};
const fakeVet = {
  id: 2,
  userId: 5,
  firstName: "Luis",
  paternalLastName: "Fernández",
  licenseNumber: "VET-003",
  specialty: "Dermatología",
};

const baseInput = {
  petId: 1,
  vetId: 2,
  date: "2026-08-10",
  time: "09:00",
  consultationType: "Consulta General",
  reason: "Revisión",
};

beforeEach(() => {
  petRepoMock.findById.mockResolvedValue(fakePet);
  vetRepoMock.findById.mockResolvedValue(fakeVet);
  appointmentRepoMock.findBookedSlotsByVetAndDate.mockResolvedValue([]);
  appointmentRepoMock.countByCodeFragment.mockResolvedValue(0);
});

describe("appointmentService.create", () => {
  it("agenda la cita cuando el horario está libre (Administrador)", async () => {
    appointmentRepoMock.create.mockResolvedValue({
      id: 1,
      code: "CITA-20260810-001",
      dateTime: "2026-08-10T09:00",
      durationMin: 30,
      pet: { id: 1, name: "Coco", species: "Perro" },
      vet: { id: 2, firstName: "Luis", paternalLastName: "Fernández" },
      consultationType: "Consulta General",
      reason: "Revisión",
      status: "CONFIRMED",
    });

    const appointment = await appointmentService.create(baseInput, { id: 1, role: "ADMIN" });

    expect(appointment.code).toBe("CITA-20260810-001");
    expect(appointmentRepoMock.create).toHaveBeenCalled();
  });

  it("rechaza con ScheduleConflictError si el horario ya está ocupado", async () => {
    appointmentRepoMock.findBookedSlotsByVetAndDate.mockResolvedValue(["09:00"]);

    await expect(appointmentService.create(baseInput, { id: 1, role: "ADMIN" })).rejects.toThrow(
      ScheduleConflictError
    );
    expect(appointmentRepoMock.create).not.toHaveBeenCalled();
  });

  it("rechaza con ForeignScheduleError si un Veterinario agenda para otro veterinario", async () => {
    vetRepoMock.findByUserId.mockResolvedValue({ ...fakeVet, id: 99 });

    await expect(appointmentService.create(baseInput, { id: 5, role: "VET" })).rejects.toThrow(
      ForeignScheduleError
    );
    expect(appointmentRepoMock.create).not.toHaveBeenCalled();
  });

  it("permite a un Veterinario agendar para sí mismo", async () => {
    vetRepoMock.findByUserId.mockResolvedValue(fakeVet);
    appointmentRepoMock.create.mockResolvedValue({
      id: 2,
      code: "CITA-20260810-002",
      dateTime: "2026-08-10T09:00",
      durationMin: 30,
      pet: { id: 1, name: "Coco", species: "Perro" },
      vet: { id: 2, firstName: "Luis", paternalLastName: "Fernández" },
      consultationType: "Consulta General",
      reason: "Revisión",
      status: "CONFIRMED",
    });

    const appointment = await appointmentService.create(baseInput, { id: 5, role: "VET" });

    expect(appointment.id).toBe(2);
  });
});
