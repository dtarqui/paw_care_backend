import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, horaLiteralToDate, literalDateOnlyToDate, literalToDate, todayISO } from "../src/utils/date";

const prisma = new PrismaClient();

function hace(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function enFecha(diasDesdeHoy: number, hora: number, minuto: number): Date {
  const hoy = todayISO();
  const fecha = addDays(hoy, diasDesdeHoy);
  const hh = String(hora).padStart(2, "0");
  const mm = String(minuto).padStart(2, "0");
  return literalToDate(`${fecha}T${hh}:${mm}`);
}

function codigoCita(diasDesdeHoy: number, secuencia: number): string {
  const fecha = addDays(todayISO(), diasDesdeHoy).replaceAll("-", "");
  return `CITA-${fecha}-${String(secuencia).padStart(3, "0")}`;
}

/** Se ejecuta antes de resembrar — borra todo en orden seguro por FK (hijos primero)
 * para poder correr este script contra una base ya poblada sin chocar con índices únicos. */
async function limpiarBaseDeDatos() {
  console.log("Borrando datos existentes...");
  await prisma.pago.deleteMany();
  await prisma.movimientoInventario.deleteMany();
  await prisma.notificacion.deleteMany();
  await prisma.controlPreventivo.deleteMany();
  await prisma.cambioMascota.deleteMany();
  await prisma.atencionMedica.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.horario.deleteMany();
  await prisma.medicamento.deleteMany();
  await prisma.veterinario.deleteMany();
  await prisma.mascota.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.propietario.deleteMany();
}

async function main() {
  await limpiarBaseDeDatos();

  console.log("Sembrando datos demo en Supabase...");

  // --- Propietarios ---------------------------------------------------
  const [roberto, elena, fernando, gabriela] = await Promise.all([
    prisma.propietario.create({ data: { nombre: "Roberto", apellidoPaterno: "Vargas Quispe", ci: "5551001", telefono: "70011122", direccion: "Av. Banzer #450, Santa Cruz" } }),
    prisma.propietario.create({ data: { nombre: "Elena", apellidoPaterno: "Choque Mamani", ci: "5551002", telefono: "70022233", direccion: "Calle Sucre #120, La Paz" } }),
    prisma.propietario.create({ data: { nombre: "Fernando", apellidoPaterno: "Salazar Rojas", ci: "5551003", telefono: "70033344", direccion: "Av. América #870, Cochabamba" } }),
    prisma.propietario.create({ data: { nombre: "Gabriela", apellidoPaterno: "Ortiz Flores", ci: "5551004", telefono: "70044455", direccion: "Calle Bolívar #300, Santa Cruz" } }),
  ]);

  // --- Mascotas ---------------------------------------------------------
  const luna = await prisma.mascota.create({ data: { propietarioId: roberto.id, nombre: "Luna", especie: "Perro", raza: "Labrador", sexo: "Hembra", fechaNacimiento: literalDateOnlyToDate("2025-03-10"), peso: 18.2 } });
  const max = await prisma.mascota.create({ data: { propietarioId: roberto.id, nombre: "Max", especie: "Perro", raza: "Pastor Alemán", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2023-11-05"), peso: 28.0 } });
  const kiara = await prisma.mascota.create({ data: { propietarioId: roberto.id, nombre: "Kiara", especie: "Perro", raza: "Chihuahua", sexo: "Hembra", fechaNacimiento: literalDateOnlyToDate("2025-08-18"), peso: 3.1 } });
  const milo = await prisma.mascota.create({ data: { propietarioId: elena.id, nombre: "Milo", especie: "Gato", raza: "Siamés", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2024-06-22"), peso: 4.8 } });
  const nina = await prisma.mascota.create({ data: { propietarioId: elena.id, nombre: "Nina", especie: "Gato", raza: "Persa", sexo: "Hembra", fechaNacimiento: literalDateOnlyToDate("2025-01-14"), peso: 3.9 } });
  const pancho = await prisma.mascota.create({ data: { propietarioId: elena.id, nombre: "Pancho", especie: "Gato", raza: "Común Europeo", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2024-09-30"), peso: 5.2 } });
  const rocky = await prisma.mascota.create({ data: { propietarioId: fernando.id, nombre: "Rocky", especie: "Perro", raza: "Bulldog Francés", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2023-05-17"), peso: 22.5 } });
  const bella = await prisma.mascota.create({ data: { propietarioId: fernando.id, nombre: "Bella", especie: "Perro", raza: "Poodle", sexo: "Hembra", fechaNacimiento: literalDateOnlyToDate("2024-02-08"), peso: 8.4 } });
  const simon = await prisma.mascota.create({ data: { propietarioId: gabriela.id, nombre: "Simón", especie: "Gato", raza: "Angora", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2025-04-25"), peso: 4.1 } });
  const toby = await prisma.mascota.create({ data: { propietarioId: gabriela.id, nombre: "Toby", especie: "Perro", raza: "Beagle", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2024-10-12"), peso: 11.3 } });

  // --- Usuarios + Veterinarios --------------------------------------------
  // admin/recepcion mantienen username y contraseña (documentados en el README) —
  // solo cambian los nombres de persona, junto con todo el resto del set demo.
  const usuarioAdmin = await prisma.usuario.create({
    data: { username: "admin", passwordHash: await hash("admin123"), nombre: "Verónica", apellidoPaterno: "Molina", ci: "1111001", rol: "ADMINISTRADOR", estado: "ACTIVO" },
  });
  const usuarioRecepcion = await prisma.usuario.create({
    data: { username: "recepcion", passwordHash: await hash("recepcion123"), nombre: "Daniela", apellidoPaterno: "Cabrera", ci: "1111002", rol: "RECEPCIONISTA", estado: "ACTIVO" },
  });
  const usuarioPatricia = await prisma.usuario.create({
    data: { username: "patricia.mendoza", passwordHash: await hash("vet123"), nombre: "Patricia", apellidoPaterno: "Mendoza", ci: "2221001", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  const usuarioDiego = await prisma.usuario.create({
    data: { username: "diego.herrera", passwordHash: await hash("vet123"), nombre: "Diego", apellidoPaterno: "Herrera", ci: "2221002", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  const usuarioValeria = await prisma.usuario.create({
    data: { username: "valeria.suarez", passwordHash: await hash("vet123"), nombre: "Valeria", apellidoPaterno: "Suárez", ci: "2221003", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  const usuarioAndres = await prisma.usuario.create({
    data: { username: "andres.paredes", passwordHash: await hash("vet123"), nombre: "Andrés", apellidoPaterno: "Paredes", ci: "2221004", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  const usuarioCamila = await prisma.usuario.create({
    data: { username: "camila.rocha", passwordHash: await hash("vet123"), nombre: "Camila", apellidoPaterno: "Rocha", ci: "2221005", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  const usuarioSebastian = await prisma.usuario.create({
    data: { username: "sebastian.guzman", passwordHash: await hash("vet123"), nombre: "Sebastián", apellidoPaterno: "Guzmán", ci: "2221006", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  void usuarioAdmin;
  void usuarioRecepcion;

  const patricia = await prisma.veterinario.create({ data: { usuarioId: usuarioPatricia.id, matricula: "VET-101", especialidad: "Medicina General" } });
  const diego = await prisma.veterinario.create({ data: { usuarioId: usuarioDiego.id, matricula: "VET-102", especialidad: "Dermatología" } });
  const valeria = await prisma.veterinario.create({ data: { usuarioId: usuarioValeria.id, matricula: "VET-103", especialidad: "Cirugía" } });
  const andres = await prisma.veterinario.create({ data: { usuarioId: usuarioAndres.id, matricula: "VET-104", especialidad: "Odontología" } });
  const camila = await prisma.veterinario.create({ data: { usuarioId: usuarioCamila.id, matricula: "VET-105", especialidad: "Oftalmología" } });
  const sebastian = await prisma.veterinario.create({ data: { usuarioId: usuarioSebastian.id, matricula: "VET-106", especialidad: "Medicina General" } });

  // --- Horarios: Lun-Vie, mañana y tarde, para los 6 veterinarios (mismo patrón
  // que usaba el bloque horario fijo del modo demo — 08:00-12:00 y 14:00-16:30). ---
  const DIAS_LABORALES = [1, 2, 3, 4, 5]; // lunes a viernes
  const veterinarios = [patricia, diego, valeria, andres, camila, sebastian];
  await prisma.horario.createMany({
    data: veterinarios.flatMap((vet) =>
      DIAS_LABORALES.flatMap((diaSemana) => [
        { veterinarioId: vet.id, diaSemana, horaInicio: horaLiteralToDate("08:00"), horaFin: horaLiteralToDate("12:00") },
        { veterinarioId: vet.id, diaSemana, horaInicio: horaLiteralToDate("14:00"), horaFin: horaLiteralToDate("16:30") },
      ])
    ),
  });

  // --- Citas -----------------------------------------------------------------
  await prisma.cita.createMany({
    data: [
      { codigo: codigoCita(0, 1), fechaHora: enFecha(0, 9, 0), duracionMin: 30, mascotaId: luna.id, veterinarioId: patricia.id, tipoConsulta: "Consulta General", motivo: "Revisión rutinaria", estado: "CONFIRMADA" },
      { codigo: codigoCita(0, 2), fechaHora: enFecha(0, 9, 30), duracionMin: 30, mascotaId: milo.id, veterinarioId: diego.id, tipoConsulta: "Vacunación", motivo: "Vacuna antirrábica", estado: "CONFIRMADA" },
      { codigo: codigoCita(0, 3), fechaHora: enFecha(0, 10, 0), duracionMin: 45, mascotaId: rocky.id, veterinarioId: valeria.id, tipoConsulta: "Control", motivo: "Control post-operatorio", estado: "ATENDIDA" },
      { codigo: codigoCita(0, 4), fechaHora: enFecha(0, 11, 0), duracionMin: 30, mascotaId: simon.id, veterinarioId: andres.id, tipoConsulta: "Consulta General", motivo: "Revisión dental", estado: "CONFIRMADA" },
      { codigo: codigoCita(1, 1), fechaHora: enFecha(1, 9, 0), duracionMin: 30, mascotaId: max.id, veterinarioId: camila.id, tipoConsulta: "Consulta General", motivo: "Chequeo general", estado: "CONFIRMADA" },
      { codigo: codigoCita(1, 2), fechaHora: enFecha(1, 9, 30), duracionMin: 30, mascotaId: nina.id, veterinarioId: sebastian.id, tipoConsulta: "Vacunación", motivo: "Vacuna triple felina", estado: "CANCELADA" },
      { codigo: codigoCita(1, 3), fechaHora: enFecha(1, 10, 30), duracionMin: 30, mascotaId: bella.id, veterinarioId: patricia.id, tipoConsulta: "Control", motivo: "Control post-quirúrgico", estado: "CONFIRMADA" },
      { codigo: codigoCita(1, 4), fechaHora: enFecha(1, 11, 0), duracionMin: 30, mascotaId: toby.id, veterinarioId: diego.id, tipoConsulta: "Consulta General", motivo: "Revisión de piel", estado: "CONFIRMADA" },
      { codigo: codigoCita(2, 1), fechaHora: enFecha(2, 9, 0), duracionMin: 30, mascotaId: kiara.id, veterinarioId: valeria.id, tipoConsulta: "Consulta General", motivo: "Chequeo de rutina", estado: "CONFIRMADA" },
      { codigo: codigoCita(2, 2), fechaHora: enFecha(2, 10, 0), duracionMin: 30, mascotaId: pancho.id, veterinarioId: andres.id, tipoConsulta: "Desparasitación", motivo: "Desparasitación programada", estado: "CONFIRMADA" },
    ],
  });

  // --- Controles preventivos --------------------------------------------------
  const hoy = todayISO();
  await prisma.controlPreventivo.createMany({
    data: [
      { mascotaId: luna.id, tipo: "VACUNA", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -360)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 5)) },
      { mascotaId: max.id, tipo: "DESPARASITACION", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -60)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 25)) },
      { mascotaId: milo.id, tipo: "VACUNA", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -395)), proximaDosis: literalDateOnlyToDate(addDays(hoy, -15)) },
      { mascotaId: nina.id, tipo: "DESPARASITACION", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -30)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 60)) },
      { mascotaId: rocky.id, tipo: "VACUNA", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -200)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 3)) },
      { mascotaId: bella.id, tipo: "DESPARASITACION", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -45)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 40)) },
      { mascotaId: simon.id, tipo: "VACUNA", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -100)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 200)) },
      { mascotaId: kiara.id, tipo: "DESPARASITACION", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -10)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 80)) },
    ],
  });

  // --- Medicamentos (tres quedan bajo el mínimo a propósito, para HU9) ------
  await prisma.medicamento.createMany({
    data: [
      { nombre: "Amoxicilina 500mg", stockActual: 45, stockMinimo: 10 },
      { nombre: "Meloxicam (antiinflamatorio)", stockActual: 5, stockMinimo: 8 },
      { nombre: "Shampoo medicado dermatológico", stockActual: 18, stockMinimo: 5 },
      { nombre: "Vacuna antirrábica", stockActual: 25, stockMinimo: 10 },
      { nombre: "Desparasitante interno (tableta)", stockActual: 4, stockMinimo: 10 },
      { nombre: "Vacuna múltiple (moquillo/parvo)", stockActual: 30, stockMinimo: 10 },
      { nombre: "Suero fisiológico", stockActual: 50, stockMinimo: 15 },
      { nombre: "Antipulgas tópico", stockActual: 6, stockMinimo: 10 },
      { nombre: "Multivitamínico", stockActual: 20, stockMinimo: 5 },
      { nombre: "Anestésico local", stockActual: 12, stockMinimo: 5 },
    ],
  });

  // --- Atenciones médicas (variedad de fechas/tipoServicio/peso para HU7/HU8
  // y para la ficha de mascota — Luna y Max acumulan varios registros de peso
  // en el tiempo para poblar el gráfico de evolución). -------------------------
  const atencionesData = [
    { mascotaId: luna.id, veterinarioId: patricia.id, fecha: hace(0), tipoServicio: "Consulta General", diagnostico: "Chequeo rutinario sin hallazgos", tratamiento: "Ninguno, control en 6 meses", examenesExternos: "", peso: 18.2, montoConsulta: 100, estadoPago: "PENDIENTE" as const },
    { mascotaId: milo.id, veterinarioId: diego.id, fecha: hace(0), tipoServicio: "Vacunación", diagnostico: "Aplicación de vacuna antirrábica", tratamiento: "Control en 1 año", examenesExternos: "", montoConsulta: 80, estadoPago: "PENDIENTE" as const },
    { mascotaId: rocky.id, veterinarioId: valeria.id, fecha: hace(0), tipoServicio: "Control", diagnostico: "Control post-operatorio de esterilización", tratamiento: "Reposo, retirar puntos en 7 días", examenesExternos: "Ecografía abdominal sin hallazgos", peso: 22.5, montoConsulta: 150, estadoPago: "PENDIENTE" as const },
    { mascotaId: simon.id, veterinarioId: andres.id, fecha: hace(1), tipoServicio: "Odontología", diagnostico: "Sarro dental moderado", tratamiento: "Limpieza dental programada", examenesExternos: "", montoConsulta: 90, estadoPago: "PENDIENTE" as const },
    { mascotaId: luna.id, veterinarioId: camila.id, fecha: hace(15), tipoServicio: "Oftalmología", diagnostico: "Conjuntivitis leve", tratamiento: "Gotas oftálmicas por 5 días", examenesExternos: "", peso: 17.8, montoConsulta: 110, estadoPago: "PAGADO" as const },
    { mascotaId: max.id, veterinarioId: sebastian.id, fecha: hace(5), tipoServicio: "Consulta General", diagnostico: "Chequeo general sin hallazgos", tratamiento: "Ninguno, control en 6 meses", examenesExternos: "", peso: 28.0, montoConsulta: 100, estadoPago: "PAGADO" as const },
    { mascotaId: nina.id, veterinarioId: patricia.id, fecha: hace(20), tipoServicio: "Vacunación", diagnostico: "Vacuna triple felina", tratamiento: "Ninguno adicional", examenesExternos: "", montoConsulta: 85, estadoPago: "PAGADO" as const },
    { mascotaId: bella.id, veterinarioId: diego.id, fecha: hace(30), tipoServicio: "Cirugía", diagnostico: "Tumor benigno en piel", tratamiento: "Extracción quirúrgica menor, control de puntos en 10 días", examenesExternos: "Biopsia enviada a laboratorio externo", peso: 8.4, montoConsulta: 350, estadoPago: "PAGADO" as const },
    { mascotaId: toby.id, veterinarioId: valeria.id, fecha: hace(10), tipoServicio: "Desparasitación", diagnostico: "Desparasitación programada", tratamiento: "Tableta desparasitante interna", examenesExternos: "", montoConsulta: 60, estadoPago: "PAGADO" as const },
    { mascotaId: kiara.id, veterinarioId: andres.id, fecha: hace(3), tipoServicio: "Control", diagnostico: "Control post-vacuna, sin reacciones", tratamiento: "Ninguno", examenesExternos: "", peso: 3.1, montoConsulta: 70, estadoPago: "PAGADO" as const },
    { mascotaId: pancho.id, veterinarioId: camila.id, fecha: hace(25), tipoServicio: "Consulta General", diagnostico: "Vómitos ocasionales, sin signos de alarma", tratamiento: "Dieta blanda por 3 días", examenesExternos: "", montoConsulta: 130, estadoPago: "PAGADO" as const },
    { mascotaId: max.id, veterinarioId: sebastian.id, fecha: hace(40), tipoServicio: "Vacunación", diagnostico: "Vacuna antirrábica anual", tratamiento: "Ninguno adicional", examenesExternos: "", peso: 27.2, montoConsulta: 90, estadoPago: "PAGADO" as const },
    { mascotaId: luna.id, veterinarioId: patricia.id, fecha: hace(45), tipoServicio: "Control", diagnostico: "Control de crecimiento", tratamiento: "Ninguno, sigue curva normal", examenesExternos: "", peso: 16.9, montoConsulta: 70, estadoPago: "PAGADO" as const },
    { mascotaId: rocky.id, veterinarioId: valeria.id, fecha: hace(50), tipoServicio: "Consulta General", diagnostico: "Cojera leve en pata trasera", tratamiento: "Reposo relativo y antiinflamatorio", examenesExternos: "Radiografía sin fractura visible", montoConsulta: 140, estadoPago: "PAGADO" as const },
    { mascotaId: milo.id, veterinarioId: diego.id, fecha: hace(60), tipoServicio: "Desparasitación", diagnostico: "Desparasitación programada", tratamiento: "Tableta desparasitante interna", examenesExternos: "", montoConsulta: 60, estadoPago: "PAGADO" as const },
    { mascotaId: simon.id, veterinarioId: andres.id, fecha: hace(35), tipoServicio: "Vacunación", diagnostico: "Vacuna triple felina", tratamiento: "Ninguno adicional", examenesExternos: "", montoConsulta: 85, estadoPago: "PAGADO" as const },
    { mascotaId: bella.id, veterinarioId: diego.id, fecha: hace(55), tipoServicio: "Control", diagnostico: "Control post-quirúrgico final", tratamiento: "Alta médica", examenesExternos: "", montoConsulta: 50, estadoPago: "PAGADO" as const },
    { mascotaId: nina.id, veterinarioId: sebastian.id, fecha: hace(12), tipoServicio: "Consulta General", diagnostico: "Estornudos frecuentes, posible alergia", tratamiento: "Antihistamínico por 5 días", examenesExternos: "", montoConsulta: 95, estadoPago: "PENDIENTE" as const },
  ];

  const atenciones = [];
  for (const data of atencionesData) {
    atenciones.push(await prisma.atencionMedica.create({ data }));
  }

  // --- Pagos: uno por cada atención sembrada como PAGADO, mismo criterio que el modo demo ---
  const METODOS = ["EFECTIVO", "QR", "TARJETA", "TRANSFERENCIA"] as const;
  const pagadas = atenciones.filter((a) => a.estadoPago === "PAGADO");
  await prisma.pago.createMany({
    data: pagadas.map((atencion, index) => ({
      atencionId: atencion.id,
      metodoPago: METODOS[index % METODOS.length],
      monto: atencion.montoConsulta,
      fecha: atencion.fecha,
    })),
  });

  console.log("Listo. Usuarios demo:");
  console.log("  admin / admin123               (ADMINISTRADOR)");
  console.log("  recepcion / recepcion123        (RECEPCIONISTA)");
  console.log("  patricia.mendoza / vet123       (VETERINARIO — Medicina General)");
  console.log("  diego.herrera / vet123          (VETERINARIO — Dermatología)");
  console.log("  valeria.suarez / vet123         (VETERINARIO — Cirugía)");
  console.log("  andres.paredes / vet123         (VETERINARIO — Odontología)");
  console.log("  camila.rocha / vet123           (VETERINARIO — Oftalmología)");
  console.log("  sebastian.guzman / vet123       (VETERINARIO — Medicina General)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
