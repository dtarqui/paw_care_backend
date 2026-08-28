import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, literalDateOnlyToDate, literalToDate, timeLiteralToDate, todayISO } from "../src/utils/date";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function onDate(daysFromToday: number, hour: number, minute: number): Date {
  const today = todayISO();
  const date = addDays(today, daysFromToday);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return literalToDate(`${date}T${hh}:${mm}`);
}

function appointmentCode(daysFromToday: number, sequence: number): string {
  const date = addDays(todayISO(), daysFromToday).replaceAll("-", "");
  return `CITA-${date}-${String(sequence).padStart(3, "0")}`;
}

/** Se ejecuta antes de resembrar — borra todo en orden seguro por FK (hijos primero)
 * para poder correr este script contra una base ya poblada sin chocar con índices únicos. */
async function clearDatabase() {
  console.log("Borrando datos existentes...");
  await prisma.payment.deleteMany();
  await prisma.qrCharge.deleteMany();
  await prisma.inventoryMove.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.preventiveControl.deleteMany();
  await prisma.petChange.deleteMany();
  await prisma.medicalVisit.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.auditLog.deleteMany();
  // Igual que la auditoría: es una bitácora de la instalación anterior, no datos demo.
  await prisma.loginEvent.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.vetInvitation.deleteMany();
  await prisma.vet.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.owner.deleteMany();
}

async function main() {
  await clearDatabase();

  console.log("Sembrando datos demo en Supabase...");

  // --- Propietarios ---------------------------------------------------
  const [roberto, elena, fernando, gabriela] = await Promise.all([
    prisma.owner.create({ data: { firstName: "Roberto", paternalLastName: "Vargas Quispe", nationalId: "5551001", phone: "70011122", address: "Av. Banzer #450, Santa Cruz" } }),
    prisma.owner.create({ data: { firstName: "Elena", paternalLastName: "Choque Mamani", nationalId: "5551002", phone: "70022233", address: "Calle Sucre #120, La Paz" } }),
    prisma.owner.create({ data: { firstName: "Fernando", paternalLastName: "Salazar Rojas", nationalId: "5551003", phone: "70033344", address: "Av. América #870, Cochabamba" } }),
    prisma.owner.create({ data: { firstName: "Gabriela", paternalLastName: "Ortiz Flores", nationalId: "5551004", phone: "70044455", address: "Calle Bolívar #300, Santa Cruz" } }),
  ]);

  // --- Mascotas ---------------------------------------------------------
  const luna = await prisma.pet.create({ data: { ownerId: roberto.id, name: "Luna", species: "Perro", breed: "Labrador", sex: "Hembra", birthDate: literalDateOnlyToDate("2025-03-10"), weight: 18.2 } });
  const max = await prisma.pet.create({ data: { ownerId: roberto.id, name: "Max", species: "Perro", breed: "Pastor Alemán", sex: "Macho", birthDate: literalDateOnlyToDate("2023-11-05"), weight: 28.0 } });
  const kiara = await prisma.pet.create({ data: { ownerId: roberto.id, name: "Kiara", species: "Perro", breed: "Chihuahua", sex: "Hembra", birthDate: literalDateOnlyToDate("2025-08-18"), weight: 3.1 } });
  const milo = await prisma.pet.create({ data: { ownerId: elena.id, name: "Milo", species: "Gato", breed: "Siamés", sex: "Macho", birthDate: literalDateOnlyToDate("2024-06-22"), weight: 4.8 } });
  const nina = await prisma.pet.create({ data: { ownerId: elena.id, name: "Nina", species: "Gato", breed: "Persa", sex: "Hembra", birthDate: literalDateOnlyToDate("2025-01-14"), weight: 3.9 } });
  const pancho = await prisma.pet.create({ data: { ownerId: elena.id, name: "Pancho", species: "Gato", breed: "Común Europeo", sex: "Macho", birthDate: literalDateOnlyToDate("2024-09-30"), weight: 5.2 } });
  const rocky = await prisma.pet.create({ data: { ownerId: fernando.id, name: "Rocky", species: "Perro", breed: "Bulldog Francés", sex: "Macho", birthDate: literalDateOnlyToDate("2023-05-17"), weight: 22.5 } });
  const bella = await prisma.pet.create({ data: { ownerId: fernando.id, name: "Bella", species: "Perro", breed: "Poodle", sex: "Hembra", birthDate: literalDateOnlyToDate("2024-02-08"), weight: 8.4 } });
  const simon = await prisma.pet.create({ data: { ownerId: gabriela.id, name: "Simón", species: "Gato", breed: "Angora", sex: "Macho", birthDate: literalDateOnlyToDate("2025-04-25"), weight: 4.1 } });
  const toby = await prisma.pet.create({ data: { ownerId: gabriela.id, name: "Toby", species: "Perro", breed: "Beagle", sex: "Macho", birthDate: literalDateOnlyToDate("2024-10-12"), weight: 11.3 } });

  // --- Usuarios + Veterinarios --------------------------------------------
  // Hay exactamente una credencial demo por rol, y son las tres que la pantalla de
  // login muestra: admin / veterinario / recepcion. Los otros 5 veterinarios existen
  // porque el set de datos los necesita (citas, horarios, atenciones repartidas), y
  // entran con su nombre.apellido — pero no se publicitan en el login.
  const adminUser = await prisma.user.create({
    data: { username: "admin", passwordHash: await hash("admin123"), firstName: "Verónica", paternalLastName: "Molina", nationalId: "1111001", role: "ADMIN", status: "ACTIVE" },
  });
  const receptionUser = await prisma.user.create({
    data: { username: "recepcion", passwordHash: await hash("recepcion123"), firstName: "Daniela", paternalLastName: "Cabrera", nationalId: "1111002", role: "RECEPTIONIST", status: "ACTIVE" },
  });
  const patriciaUser = await prisma.user.create({
    data: { username: "veterinario", passwordHash: await hash("vet123"), firstName: "Patricia", paternalLastName: "Mendoza", nationalId: "2221001", role: "VET", status: "ACTIVE" },
  });
  const diegoUser = await prisma.user.create({
    data: { username: "diego.herrera", passwordHash: await hash("vet123"), firstName: "Diego", paternalLastName: "Herrera", nationalId: "2221002", role: "VET", status: "ACTIVE" },
  });
  const valeriaUser = await prisma.user.create({
    data: { username: "valeria.suarez", passwordHash: await hash("vet123"), firstName: "Valeria", paternalLastName: "Suárez", nationalId: "2221003", role: "VET", status: "ACTIVE" },
  });
  const andresUser = await prisma.user.create({
    data: { username: "andres.paredes", passwordHash: await hash("vet123"), firstName: "Andrés", paternalLastName: "Paredes", nationalId: "2221004", role: "VET", status: "ACTIVE" },
  });
  const camilaUser = await prisma.user.create({
    data: { username: "camila.rocha", passwordHash: await hash("vet123"), firstName: "Camila", paternalLastName: "Rocha", nationalId: "2221005", role: "VET", status: "ACTIVE" },
  });
  const sebastianUser = await prisma.user.create({
    data: { username: "sebastian.guzman", passwordHash: await hash("vet123"), firstName: "Sebastián", paternalLastName: "Guzmán", nationalId: "2221006", role: "VET", status: "ACTIVE" },
  });
  void adminUser;
  void receptionUser;

  const patricia = await prisma.vet.create({ data: { userId: patriciaUser.id, licenseNumber: "VET-101", specialty: "Medicina General" } });
  const diego = await prisma.vet.create({ data: { userId: diegoUser.id, licenseNumber: "VET-102", specialty: "Dermatología" } });
  const valeria = await prisma.vet.create({ data: { userId: valeriaUser.id, licenseNumber: "VET-103", specialty: "Cirugía" } });
  const andres = await prisma.vet.create({ data: { userId: andresUser.id, licenseNumber: "VET-104", specialty: "Odontología" } });
  const camila = await prisma.vet.create({ data: { userId: camilaUser.id, licenseNumber: "VET-105", specialty: "Oftalmología" } });
  const sebastian = await prisma.vet.create({ data: { userId: sebastianUser.id, licenseNumber: "VET-106", specialty: "Medicina General" } });

  // --- Horarios: Lun-Vie, mañana y tarde, para los 6 veterinarios (mismo patrón
  // que usaba el bloque horario fijo del modo demo — 08:00-12:00 y 14:00-16:30). ---
  const WORKING_DAYS = [1, 2, 3, 4, 5]; // lunes a viernes
  const vets = [patricia, diego, valeria, andres, camila, sebastian];
  await prisma.schedule.createMany({
    data: vets.flatMap((vet) =>
      WORKING_DAYS.flatMap((dayOfWeek) => [
        { vetId: vet.id, dayOfWeek, startTime: timeLiteralToDate("08:00"), endTime: timeLiteralToDate("12:00") },
        { vetId: vet.id, dayOfWeek, startTime: timeLiteralToDate("14:00"), endTime: timeLiteralToDate("16:30") },
      ])
    ),
  });

  // --- Citas -----------------------------------------------------------------
  await prisma.appointment.createMany({
    data: [
      { code: appointmentCode(0, 1), dateTime: onDate(0, 9, 0), durationMin: 30, petId: luna.id, vetId: patricia.id, consultationType: "Consulta General", reason: "Revisión rutinaria", status: "CONFIRMED" },
      { code: appointmentCode(0, 2), dateTime: onDate(0, 9, 30), durationMin: 30, petId: milo.id, vetId: diego.id, consultationType: "Vacunación", reason: "Vacuna antirrábica", status: "CONFIRMED" },
      { code: appointmentCode(0, 3), dateTime: onDate(0, 10, 0), durationMin: 45, petId: rocky.id, vetId: valeria.id, consultationType: "Control", reason: "Control post-operatorio", status: "ATTENDED" },
      { code: appointmentCode(0, 4), dateTime: onDate(0, 11, 0), durationMin: 30, petId: simon.id, vetId: andres.id, consultationType: "Consulta General", reason: "Revisión dental", status: "CONFIRMED" },
      { code: appointmentCode(1, 1), dateTime: onDate(1, 9, 0), durationMin: 30, petId: max.id, vetId: camila.id, consultationType: "Consulta General", reason: "Chequeo general", status: "CONFIRMED" },
      { code: appointmentCode(1, 2), dateTime: onDate(1, 9, 30), durationMin: 30, petId: nina.id, vetId: sebastian.id, consultationType: "Vacunación", reason: "Vacuna triple felina", status: "CANCELLED" },
      { code: appointmentCode(1, 3), dateTime: onDate(1, 10, 30), durationMin: 30, petId: bella.id, vetId: patricia.id, consultationType: "Control", reason: "Control post-quirúrgico", status: "CONFIRMED" },
      { code: appointmentCode(1, 4), dateTime: onDate(1, 11, 0), durationMin: 30, petId: toby.id, vetId: diego.id, consultationType: "Consulta General", reason: "Revisión de piel", status: "CONFIRMED" },
      { code: appointmentCode(2, 1), dateTime: onDate(2, 9, 0), durationMin: 30, petId: kiara.id, vetId: valeria.id, consultationType: "Consulta General", reason: "Chequeo de rutina", status: "CONFIRMED" },
      { code: appointmentCode(2, 2), dateTime: onDate(2, 10, 0), durationMin: 30, petId: pancho.id, vetId: andres.id, consultationType: "Desparasitación", reason: "Desparasitación programada", status: "CONFIRMED" },
    ],
  });

  // --- Controles preventivos --------------------------------------------------
  const today = todayISO();
  await prisma.preventiveControl.createMany({
    data: [
      { petId: luna.id, type: "VACCINE", productName: "Antirrábica", batchNumber: "A-2451", appliedOn: literalDateOnlyToDate(addDays(today, -360)), nextDoseOn: literalDateOnlyToDate(addDays(today, 5)) },
      { petId: max.id, type: "DEWORMING", productName: "Endogard", batchNumber: null, appliedOn: literalDateOnlyToDate(addDays(today, -60)), nextDoseOn: literalDateOnlyToDate(addDays(today, 25)) },
      { petId: milo.id, type: "VACCINE", productName: "Triple felina", batchNumber: "F-1180", appliedOn: literalDateOnlyToDate(addDays(today, -395)), nextDoseOn: literalDateOnlyToDate(addDays(today, -15)) },
      { petId: nina.id, type: "DEWORMING", productName: "Drontal", batchNumber: "D-7702", appliedOn: literalDateOnlyToDate(addDays(today, -30)), nextDoseOn: literalDateOnlyToDate(addDays(today, 60)) },
      { petId: rocky.id, type: "VACCINE", productName: "Quíntuple canina", batchNumber: "Q-3390", appliedOn: literalDateOnlyToDate(addDays(today, -200)), nextDoseOn: literalDateOnlyToDate(addDays(today, 3)) },
      { petId: bella.id, type: "DEWORMING", productName: null, batchNumber: null, appliedOn: literalDateOnlyToDate(addDays(today, -45)), nextDoseOn: literalDateOnlyToDate(addDays(today, 40)) },
      { petId: simon.id, type: "VACCINE", productName: "Leucemia felina", batchNumber: "L-0455", appliedOn: literalDateOnlyToDate(addDays(today, -100)), nextDoseOn: literalDateOnlyToDate(addDays(today, 200)) },
      { petId: kiara.id, type: "DEWORMING", productName: "Endogard", batchNumber: "E-9021", appliedOn: literalDateOnlyToDate(addDays(today, -10)), nextDoseOn: literalDateOnlyToDate(addDays(today, 80)) },
    ],
  });

  // --- Medicamentos (tres quedan bajo el mínimo a propósito, para HU9) ------
  await prisma.medication.createMany({
    data: [
      { name: "Amoxicilina 500mg", currentStock: 45, minimumStock: 10 },
      { name: "Meloxicam (antiinflamatorio)", currentStock: 5, minimumStock: 8 },
      { name: "Shampoo medicado dermatológico", currentStock: 18, minimumStock: 5 },
      { name: "Vacuna antirrábica", currentStock: 25, minimumStock: 10 },
      { name: "Desparasitante interno (tableta)", currentStock: 4, minimumStock: 10 },
      { name: "Vacuna múltiple (moquillo/parvo)", currentStock: 30, minimumStock: 10 },
      { name: "Suero fisiológico", currentStock: 50, minimumStock: 15 },
      { name: "Antipulgas tópico", currentStock: 6, minimumStock: 10 },
      { name: "Multivitamínico", currentStock: 20, minimumStock: 5 },
      { name: "Anestésico local", currentStock: 12, minimumStock: 5 },
    ],
  });

  // --- Atenciones médicas (variedad de fechas/serviceType/peso para HU7/HU8
  // y para la ficha de mascota — Luna y Max acumulan varios registros de peso
  // en el tiempo para poblar el gráfico de evolución). -------------------------
  const visitsData = [
    { petId: luna.id, vetId: patricia.id, date: daysAgo(0), serviceType: "Consulta General", diagnosis: "Chequeo rutinario sin hallazgos", treatment: "Ninguno, control en 6 meses", externalExams: "", weight: 18.2, consultationFee: 100, paymentStatus: "PENDING" as const },
    { petId: milo.id, vetId: diego.id, date: daysAgo(0), serviceType: "Vacunación", diagnosis: "Aplicación de vacuna antirrábica", treatment: "Control en 1 año", externalExams: "", consultationFee: 80, paymentStatus: "PENDING" as const },
    { petId: rocky.id, vetId: valeria.id, date: daysAgo(0), serviceType: "Control", diagnosis: "Control post-operatorio de esterilización", treatment: "Reposo, retirar puntos en 7 días", externalExams: "Ecografía abdominal sin hallazgos", weight: 22.5, consultationFee: 150, paymentStatus: "PENDING" as const },
    { petId: simon.id, vetId: andres.id, date: daysAgo(1), serviceType: "Odontología", diagnosis: "Sarro dental moderado", treatment: "Limpieza dental programada", externalExams: "", consultationFee: 90, paymentStatus: "PENDING" as const },
    { petId: luna.id, vetId: camila.id, date: daysAgo(15), serviceType: "Oftalmología", diagnosis: "Conjuntivitis leve", treatment: "Gotas oftálmicas por 5 días", externalExams: "", weight: 17.8, consultationFee: 110, paymentStatus: "PAID" as const },
    { petId: max.id, vetId: sebastian.id, date: daysAgo(5), serviceType: "Consulta General", diagnosis: "Chequeo general sin hallazgos", treatment: "Ninguno, control en 6 meses", externalExams: "", weight: 28.0, consultationFee: 100, paymentStatus: "PAID" as const },
    { petId: nina.id, vetId: patricia.id, date: daysAgo(20), serviceType: "Vacunación", diagnosis: "Vacuna triple felina", treatment: "Ninguno adicional", externalExams: "", consultationFee: 85, paymentStatus: "PAID" as const },
    { petId: bella.id, vetId: diego.id, date: daysAgo(30), serviceType: "Cirugía", diagnosis: "Tumor benigno en piel", treatment: "Extracción quirúrgica menor, control de puntos en 10 días", externalExams: "Biopsia enviada a laboratorio externo", weight: 8.4, consultationFee: 350, paymentStatus: "PAID" as const },
    { petId: toby.id, vetId: valeria.id, date: daysAgo(10), serviceType: "Desparasitación", diagnosis: "Desparasitación programada", treatment: "Tableta desparasitante interna", externalExams: "", consultationFee: 60, paymentStatus: "PAID" as const },
    { petId: kiara.id, vetId: andres.id, date: daysAgo(3), serviceType: "Control", diagnosis: "Control post-vacuna, sin reacciones", treatment: "Ninguno", externalExams: "", weight: 3.1, consultationFee: 70, paymentStatus: "PAID" as const },
    { petId: pancho.id, vetId: camila.id, date: daysAgo(25), serviceType: "Consulta General", diagnosis: "Vómitos ocasionales, sin signos de alarma", treatment: "Dieta blanda por 3 días", externalExams: "", consultationFee: 130, paymentStatus: "PAID" as const },
    { petId: max.id, vetId: sebastian.id, date: daysAgo(40), serviceType: "Vacunación", diagnosis: "Vacuna antirrábica anual", treatment: "Ninguno adicional", externalExams: "", weight: 27.2, consultationFee: 90, paymentStatus: "PAID" as const },
    { petId: luna.id, vetId: patricia.id, date: daysAgo(45), serviceType: "Control", diagnosis: "Control de crecimiento", treatment: "Ninguno, sigue curva normal", externalExams: "", weight: 16.9, consultationFee: 70, paymentStatus: "PAID" as const },
    { petId: rocky.id, vetId: valeria.id, date: daysAgo(50), serviceType: "Consulta General", diagnosis: "Cojera leve en pata trasera", treatment: "Reposo relativo y antiinflamatorio", externalExams: "Radiografía sin fractura visible", consultationFee: 140, paymentStatus: "PAID" as const },
    { petId: milo.id, vetId: diego.id, date: daysAgo(60), serviceType: "Desparasitación", diagnosis: "Desparasitación programada", treatment: "Tableta desparasitante interna", externalExams: "", consultationFee: 60, paymentStatus: "PAID" as const },
    { petId: simon.id, vetId: andres.id, date: daysAgo(35), serviceType: "Vacunación", diagnosis: "Vacuna triple felina", treatment: "Ninguno adicional", externalExams: "", consultationFee: 85, paymentStatus: "PAID" as const },
    { petId: bella.id, vetId: diego.id, date: daysAgo(55), serviceType: "Control", diagnosis: "Control post-quirúrgico final", treatment: "Alta médica", externalExams: "", consultationFee: 50, paymentStatus: "PAID" as const },
    { petId: nina.id, vetId: sebastian.id, date: daysAgo(12), serviceType: "Consulta General", diagnosis: "Estornudos frecuentes, posible alergia", treatment: "Antihistamínico por 5 días", externalExams: "", consultationFee: 95, paymentStatus: "PENDING" as const },
  ];

  const visits = [];
  for (const data of visitsData) {
    visits.push(await prisma.medicalVisit.create({ data }));
  }

  // --- Pagos: uno por cada atención sembrada como PAID, mismo criterio que el modo demo ---
  const METHODS = ["CASH", "QR", "CARD", "TRANSFER"] as const;
  const paidVisits = visits.filter((v) => v.paymentStatus === "PAID");
  await prisma.payment.createMany({
    data: paidVisits.map((visit, index) => ({
      visitId: visit.id,
      method: METHODS[index % METHODS.length],
      amount: visit.consultationFee,
      date: visit.date,
    })),
  });

  // Una credencial demo por rol — son las tres que muestra la pantalla de login.
  console.log("Listo. Credenciales demo (una por rol):");
  console.log("  admin / admin123           (ADMIN        — Verónica Molina)");
  console.log("  veterinario / vet123       (VET          — Patricia Mendoza)");
  console.log("  recepcion / recepcion123   (RECEPTIONIST — Daniela Cabrera)");
  console.log("");
  console.log("Los otros 5 veterinarios existen como datos (citas, horarios, atenciones)");
  console.log("y también entran con vet123: diego.herrera, valeria.suarez, andres.paredes,");
  console.log("camila.rocha, sebastian.guzman.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
