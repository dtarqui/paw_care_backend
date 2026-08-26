import ExcelJS from "exceljs";
import { appointmentRepository } from "../repositories/appointment.repository";
import { medicalVisitRepository } from "../repositories/medicalVisit.repository";
import { medicationRepository } from "../repositories/medication.repository";
import { ownerRepository } from "../repositories/owner.repository";
import { paymentRepository } from "../repositories/payment.repository";
import { petRepository } from "../repositories/pet.repository";
import { preventiveControlRepository } from "../repositories/preventiveControl.repository";
import { userRepository } from "../repositories/user.repository";
import { vetRepository } from "../repositories/vet.repository";
import { label } from "../utils/labels";

// Los `header` van en español: son los títulos de columna que ve quien abre el
// Excel. Las `key` van en inglés, como el resto del código.
function sheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Partial<ExcelJS.Column>[],
  rows: readonly unknown[]
) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = columns;
  worksheet.addRows(rows as Record<string, unknown>[]);
  worksheet.getRow(1).font = { bold: true };
}

/** HU15 — un archivo con una hoja por entidad, para que el dueño de la clínica
 * pueda llevarse todos sus datos en cualquier momento (sin depender del proveedor). */
export async function generateFullExport(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  const [users, vets, owners, pets, appointments, visits, payments, controls, medications] =
    await Promise.all([
      userRepository.findAll(),
      vetRepository.findAll(),
      ownerRepository.findAll(),
      petRepository.findAll(),
      appointmentRepository.findAll(),
      medicalVisitRepository.findAll(),
      paymentRepository.findAllRaw(),
      preventiveControlRepository.findAll(),
      medicationRepository.findAll(),
    ]);

  sheet(
    workbook,
    "Usuarios",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "firstName", width: 20 },
      { header: "Apellido Paterno", key: "paternalLastName", width: 20 },
      { header: "CI", key: "nationalId", width: 14 },
      { header: "Usuario", key: "username", width: 16 },
      { header: "Rol", key: "role", width: 16 },
      { header: "Estado", key: "status", width: 12 },
    ],
    users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      paternalLastName: u.paternalLastName,
      nationalId: u.nationalId,
      username: u.username,
      role: label.role(u.role),
      status: label.recordStatus(u.status),
    }))
  );

  sheet(
    workbook,
    "Veterinarios",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "firstName", width: 20 },
      { header: "Apellido Paterno", key: "paternalLastName", width: 20 },
      { header: "Matrícula", key: "licenseNumber", width: 14 },
      { header: "Especialidad", key: "specialty", width: 22 },
    ],
    vets
  );

  sheet(
    workbook,
    "Propietarios",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "firstName", width: 20 },
      { header: "Apellido Paterno", key: "paternalLastName", width: 20 },
      { header: "CI", key: "nationalId", width: 14 },
      { header: "Teléfono", key: "phone", width: 14 },
    ],
    owners
  );

  sheet(
    workbook,
    "Mascotas",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "name", width: 18 },
      { header: "Especie", key: "species", width: 12 },
      { header: "Raza", key: "breed", width: 18 },
      { header: "Sexo", key: "sex", width: 10 },
      { header: "Propietario", key: "owner", width: 25 },
    ],
    pets.map((p) => ({
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      sex: p.sex,
      owner: `${p.owner.firstName} ${p.owner.paternalLastName}`,
    }))
  );

  sheet(
    workbook,
    "Citas",
    [
      { header: "Código", key: "code", width: 20 },
      { header: "Fecha/Hora", key: "dateTime", width: 20 },
      { header: "Mascota", key: "pet", width: 18 },
      { header: "Veterinario", key: "vet", width: 22 },
      { header: "Tipo", key: "consultationType", width: 18 },
      { header: "Estado", key: "status", width: 14 },
    ],
    appointments.map((a) => ({
      code: a.code,
      dateTime: `${a.dateTime.slice(0, 10)} ${a.dateTime.slice(11, 16)}`,
      pet: a.pet.name,
      vet: `${a.vet.firstName} ${a.vet.paternalLastName}`,
      consultationType: a.consultationType,
      status: label.appointmentStatus(a.status),
    }))
  );

  const petById = new Map(pets.map((p) => [p.id, p]));
  const vetById = new Map(vets.map((v) => [v.id, v]));

  sheet(
    workbook,
    "AtencionesMedicas",
    [
      { header: "Fecha", key: "date", width: 14 },
      { header: "Mascota", key: "pet", width: 18 },
      { header: "Veterinario", key: "vet", width: 22 },
      { header: "Tipo de servicio", key: "serviceType", width: 18 },
      { header: "Diagnóstico", key: "diagnosis", width: 30 },
      { header: "Monto (Bs.)", key: "consultationFee", width: 14 },
      { header: "Estado de pago", key: "paymentStatus", width: 16 },
    ],
    visits.map((v) => {
      const pet = petById.get(v.petId);
      const vet = vetById.get(v.vetId);
      return {
        date: v.date.slice(0, 10),
        pet: pet?.name ?? "—",
        vet: vet ? `${vet.firstName} ${vet.paternalLastName}` : "—",
        serviceType: v.serviceType,
        diagnosis: v.diagnosis,
        consultationFee: v.consultationFee,
        paymentStatus: label.visitPaymentStatus(v.paymentStatus),
      };
    })
  );

  sheet(
    workbook,
    "Pagos",
    [
      { header: "Atención", key: "visitId", width: 12 },
      { header: "Método de pago", key: "method", width: 16 },
      { header: "Monto (Bs.)", key: "amount", width: 14 },
      { header: "Fecha", key: "date", width: 14 },
    ],
    payments.map((p) => ({
      visitId: p.visitId,
      method: label.paymentMethod(p.method),
      amount: p.amount,
      date: p.date.slice(0, 10),
    }))
  );

  sheet(
    workbook,
    "ControlesPreventivos",
    [
      { header: "Mascota", key: "pet", width: 18 },
      { header: "Tipo", key: "type", width: 16 },
      { header: "Fecha aplicación", key: "appliedOn", width: 16 },
      { header: "Próxima dosis", key: "nextDoseOn", width: 16 },
    ],
    controls.map((c) => ({
      pet: petById.get(c.petId)?.name ?? "—",
      type: label.preventiveControlType(c.type),
      appliedOn: c.appliedOn,
      nextDoseOn: c.nextDoseOn,
    }))
  );

  sheet(
    workbook,
    "Medicamentos",
    [
      { header: "Nombre", key: "name", width: 30 },
      { header: "Stock actual", key: "currentStock", width: 14 },
      { header: "Stock mínimo", key: "minimumStock", width: 14 },
    ],
    medications
  );

  return workbook;
}
