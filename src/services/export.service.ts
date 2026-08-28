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
import { Labels, labelsFor, Language } from "../utils/labels";

// Los `header` los pone `utils/labels.ts` en el idioma que pidió el navegador: son
// los títulos de columna que ve quien abre el Excel. Las `key` van en inglés, como
// el resto del código, porque son las propiedades del objeto de la fila.
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
export async function generateFullExport(language: Language): Promise<ExcelJS.Workbook> {
  const label: Labels = labelsFor(language);
  const t = label.text;
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
    t("sheetUsers"),
    [
      { header: t("id"), key: "id", width: 8 },
      { header: t("firstName"), key: "firstName", width: 20 },
      { header: t("paternalLastName"), key: "paternalLastName", width: 20 },
      { header: t("nationalId"), key: "nationalId", width: 14 },
      { header: t("username"), key: "username", width: 16 },
      { header: t("role"), key: "role", width: 16 },
      { header: t("status"), key: "status", width: 12 },
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
    t("sheetVets"),
    [
      { header: t("id"), key: "id", width: 8 },
      { header: t("firstName"), key: "firstName", width: 20 },
      { header: t("paternalLastName"), key: "paternalLastName", width: 20 },
      { header: t("licenseNumber"), key: "licenseNumber", width: 14 },
      { header: t("specialty"), key: "specialty", width: 22 },
    ],
    vets
  );

  sheet(
    workbook,
    t("sheetOwners"),
    [
      { header: t("id"), key: "id", width: 8 },
      { header: t("firstName"), key: "firstName", width: 20 },
      { header: t("paternalLastName"), key: "paternalLastName", width: 20 },
      { header: t("nationalId"), key: "nationalId", width: 14 },
      { header: t("phone"), key: "phone", width: 14 },
    ],
    owners
  );

  sheet(
    workbook,
    t("sheetPets"),
    [
      { header: t("id"), key: "id", width: 8 },
      { header: t("name"), key: "name", width: 18 },
      { header: t("species"), key: "species", width: 12 },
      { header: t("breed"), key: "breed", width: 18 },
      { header: t("sex"), key: "sex", width: 10 },
      { header: t("owner"), key: "owner", width: 25 },
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
    t("sheetAppointments"),
    [
      { header: t("code"), key: "code", width: 20 },
      { header: t("dateTime"), key: "dateTime", width: 20 },
      { header: t("pet"), key: "pet", width: 18 },
      { header: t("vet"), key: "vet", width: 22 },
      { header: t("type"), key: "consultationType", width: 18 },
      { header: t("status"), key: "status", width: 14 },
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
    t("sheetVisits"),
    [
      { header: t("date"), key: "date", width: 14 },
      { header: t("pet"), key: "pet", width: 18 },
      { header: t("vet"), key: "vet", width: 22 },
      { header: t("serviceType"), key: "serviceType", width: 18 },
      { header: t("diagnosis"), key: "diagnosis", width: 30 },
      { header: t("amountBs"), key: "consultationFee", width: 14 },
      { header: t("paymentStatus"), key: "paymentStatus", width: 16 },
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
    t("sheetPayments"),
    [
      { header: t("visit"), key: "visitId", width: 12 },
      { header: t("paymentMethod"), key: "method", width: 16 },
      { header: t("amountBs"), key: "amount", width: 14 },
      { header: t("date"), key: "date", width: 14 },
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
    t("sheetPreventive"),
    [
      { header: t("pet"), key: "pet", width: 18 },
      { header: t("type"), key: "type", width: 16 },
      { header: t("productName"), key: "productName", width: 22 },
      { header: t("batchNumber"), key: "batchNumber", width: 14 },
      { header: t("appliedOn"), key: "appliedOn", width: 16 },
      { header: t("nextDoseOn"), key: "nextDoseOn", width: 16 },
    ],
    controls.map((c) => ({
      pet: petById.get(c.petId)?.name ?? "—",
      type: label.preventiveControlType(c.type),
      productName: c.productName ?? "",
      batchNumber: c.batchNumber ?? "",
      appliedOn: c.appliedOn,
      nextDoseOn: c.nextDoseOn,
    }))
  );

  sheet(
    workbook,
    t("sheetMedications"),
    [
      { header: t("name"), key: "name", width: 30 },
      { header: t("currentStock"), key: "currentStock", width: 14 },
      { header: t("minimumStock"), key: "minimumStock", width: 14 },
    ],
    medications
  );

  return workbook;
}
