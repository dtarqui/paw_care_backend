import { citaRepository } from "../repositories/cita.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
import { AgendaAjenaError, ConflictoDeAgendaError, citaService } from "./cita.service";

jest.mock("../repositories/cita.repository");
jest.mock("../repositories/mascota.repository");
jest.mock("../repositories/veterinario.repository");

const citaRepoMock = citaRepository as jest.Mocked<typeof citaRepository>;
const mascotaRepoMock = mascotaRepository as jest.Mocked<typeof mascotaRepository>;
const veterinarioRepoMock = veterinarioRepository as jest.Mocked<typeof veterinarioRepository>;

const mascotaFalsa = { id: 1, nombre: "Coco", especie: "Perro", raza: "", sexo: "Macho" as const, fechaNacimiento: "", peso: 0, estado: "ACTIVO" as const, propietario: { id: 1, nombre: "Juan", apellidoPaterno: "Pérez", ci: "123", telefono: "" } };
const veterinarioFalso = { id: 2, usuarioId: 5, nombre: "Luis", apellidoPaterno: "Fernández", matricula: "VET-003", especialidad: "Dermatología" };

const inputBase = {
  mascotaId: 1,
  veterinarioId: 2,
  fecha: "2026-08-10",
  hora: "09:00",
  tipoConsulta: "Consulta General",
  motivo: "Revisión",
};

beforeEach(() => {
  mascotaRepoMock.findById.mockResolvedValue(mascotaFalsa);
  veterinarioRepoMock.findById.mockResolvedValue(veterinarioFalso);
  citaRepoMock.findOcupadosPorVeterinarioYFecha.mockResolvedValue([]);
  citaRepoMock.contarPorCodigoParcial.mockResolvedValue(0);
});

describe("citaService.crear", () => {
  it("agenda la cita cuando el horario está libre (Administrador)", async () => {
    citaRepoMock.create.mockResolvedValue({
      id: 1,
      codigo: "CITA-20260810-001",
      fechaHora: "2026-08-10T09:00",
      duracionMin: 30,
      mascota: { id: 1, nombre: "Coco", especie: "Perro" },
      veterinario: { id: 2, nombre: "Luis", apellidoPaterno: "Fernández" },
      tipoConsulta: "Consulta General",
      motivo: "Revisión",
      estado: "CONFIRMADA",
    });

    const cita = await citaService.crear(inputBase, { id: 1, rol: "ADMINISTRADOR" });

    expect(cita.codigo).toBe("CITA-20260810-001");
    expect(citaRepoMock.create).toHaveBeenCalled();
  });

  it("rechaza con ConflictoDeAgendaError si el horario ya está ocupado", async () => {
    citaRepoMock.findOcupadosPorVeterinarioYFecha.mockResolvedValue(["09:00"]);

    await expect(citaService.crear(inputBase, { id: 1, rol: "ADMINISTRADOR" })).rejects.toThrow(ConflictoDeAgendaError);
    expect(citaRepoMock.create).not.toHaveBeenCalled();
  });

  it("rechaza con AgendaAjenaError si un Veterinario agenda para otro veterinario", async () => {
    veterinarioRepoMock.findByUsuarioId.mockResolvedValue({ ...veterinarioFalso, id: 99 });

    await expect(citaService.crear(inputBase, { id: 5, rol: "VETERINARIO" })).rejects.toThrow(AgendaAjenaError);
    expect(citaRepoMock.create).not.toHaveBeenCalled();
  });

  it("permite a un Veterinario agendar para sí mismo", async () => {
    veterinarioRepoMock.findByUsuarioId.mockResolvedValue(veterinarioFalso);
    citaRepoMock.create.mockResolvedValue({
      id: 2,
      codigo: "CITA-20260810-002",
      fechaHora: "2026-08-10T09:00",
      duracionMin: 30,
      mascota: { id: 1, nombre: "Coco", especie: "Perro" },
      veterinario: { id: 2, nombre: "Luis", apellidoPaterno: "Fernández" },
      tipoConsulta: "Consulta General",
      motivo: "Revisión",
      estado: "CONFIRMADA",
    });

    const cita = await citaService.crear(inputBase, { id: 5, rol: "VETERINARIO" });

    expect(cita.id).toBe(2);
  });
});
