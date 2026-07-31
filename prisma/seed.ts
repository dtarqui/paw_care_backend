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

async function main() {
  console.log("Sembrando datos demo en Supabase...");

  // --- Propietarios ---------------------------------------------------
  const [juan, carlosR] = await Promise.all([
    prisma.propietario.create({ data: { nombre: "Juan", apellidoPaterno: "Pérez González", ci: "4521367", telefono: "71234567" } }),
    prisma.propietario.create({ data: { nombre: "Carlos", apellidoPaterno: "Rodríguez Sánchez", ci: "6789012", telefono: "76543210" } }),
  ]);

  // --- Mascotas ---------------------------------------------------------
  const coco = await prisma.mascota.create({ data: { propietarioId: juan.id, nombre: "Coco", especie: "Perro", raza: "San Bernardo", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2025-05-22"), peso: 15.5 } });
  const billy = await prisma.mascota.create({ data: { propietarioId: carlosR.id, nombre: "Billy", especie: "Perro", raza: "Golden Retriever", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2025-04-10"), peso: 10.2 } });
  const rally = await prisma.mascota.create({ data: { propietarioId: juan.id, nombre: "Rally", especie: "Perro", raza: "Golden Retriever", sexo: "Macho", fechaNacimiento: literalDateOnlyToDate("2024-05-16"), peso: 25.5 } });
  const tom = await prisma.mascota.create({ data: { propietarioId: juan.id, nombre: "Tom", especie: "Gato", raza: "Angora", sexo: "Hembra", fechaNacimiento: literalDateOnlyToDate("2025-06-04"), peso: 5.6 } });
  const tommy = await prisma.mascota.create({ data: { propietarioId: juan.id, nombre: "Tommy", especie: "Perro", raza: "Golden Retriever", sexo: "Hembra", fechaNacimiento: literalDateOnlyToDate("2025-06-01"), peso: 15.8 } });

  // --- Usuarios + Veterinarios --------------------------------------------
  // Los 3 veterinarios del demo ahora tienen cuenta propia (el modelo real exige
  // Veterinario.usuarioId — database/MODELO_DATOS.md). Antes solo Luis podía
  // iniciar sesión; ahora Carlos y María también, con la misma contraseña demo.
  const usuarioAdmin = await prisma.usuario.create({
    data: { username: "admin", passwordHash: await hash("admin123"), nombre: "Ana", apellidoPaterno: "García", ci: "1234567", rol: "ADMINISTRADOR", estado: "ACTIVO" },
  });
  const usuarioRecepcion = await prisma.usuario.create({
    data: { username: "recepcion", passwordHash: await hash("recepcion123"), nombre: "Sofía", apellidoPaterno: "Rojas", ci: "3456789", rol: "RECEPCIONISTA", estado: "ACTIVO" },
  });
  const usuarioLuis = await prisma.usuario.create({
    data: { username: "veterinario", passwordHash: await hash("vet123"), nombre: "Luis", apellidoPaterno: "Fernández", ci: "2345678", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  const usuarioCarlos = await prisma.usuario.create({
    data: { username: "carlos.andrade", passwordHash: await hash("vet123"), nombre: "Carlos", apellidoPaterno: "Andrade", ci: "5678901", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  const usuarioMaria = await prisma.usuario.create({
    data: { username: "maria.rodriguez", passwordHash: await hash("vet123"), nombre: "María", apellidoPaterno: "Rodríguez", ci: "6789234", rol: "VETERINARIO", estado: "ACTIVO" },
  });
  void usuarioAdmin;
  void usuarioRecepcion;

  const carlos = await prisma.veterinario.create({ data: { usuarioId: usuarioCarlos.id, matricula: "VET-011", especialidad: "Medicina General" } });
  const luis = await prisma.veterinario.create({ data: { usuarioId: usuarioLuis.id, matricula: "VET-003", especialidad: "Dermatología" } });
  const maria = await prisma.veterinario.create({ data: { usuarioId: usuarioMaria.id, matricula: "VET-004", especialidad: "Cirugía" } });

  // --- Horarios: Lun-Vie, mañana y tarde, para los 3 veterinarios (misma franja
  // que usaba el bloque horario fijo del modo demo — 08:00-11:30 y 14:00-16:00
  // en bloques de 30 min, ver horario.service.ts:generarBloques). ------------
  const DIAS_LABORALES = [1, 2, 3, 4, 5]; // lunes a viernes
  await prisma.horario.createMany({
    data: [carlos, luis, maria].flatMap((vet) =>
      DIAS_LABORALES.flatMap((diaSemana) => [
        { veterinarioId: vet.id, diaSemana, horaInicio: horaLiteralToDate("08:00"), horaFin: horaLiteralToDate("12:00") },
        { veterinarioId: vet.id, diaSemana, horaInicio: horaLiteralToDate("14:00"), horaFin: horaLiteralToDate("16:30") },
      ])
    ),
  });

  // --- Citas -----------------------------------------------------------------
  await prisma.cita.createMany({
    data: [
      { codigo: codigoCita(0, 1), fechaHora: enFecha(0, 9, 0), duracionMin: 30, mascotaId: rally.id, veterinarioId: luis.id, tipoConsulta: "Consulta General", motivo: "Revisión rutinaria", estado: "CONFIRMADA" },
      { codigo: codigoCita(0, 2), fechaHora: enFecha(0, 9, 30), duracionMin: 30, mascotaId: tom.id, veterinarioId: carlos.id, tipoConsulta: "Vacunación", motivo: "Vacuna antirrábica", estado: "CONFIRMADA" },
      { codigo: codigoCita(0, 3), fechaHora: enFecha(0, 11, 0), duracionMin: 45, mascotaId: coco.id, veterinarioId: luis.id, tipoConsulta: "Control", motivo: "Revisión de piel", estado: "ATENDIDA" },
      { codigo: codigoCita(1, 1), fechaHora: enFecha(1, 9, 0), duracionMin: 30, mascotaId: tommy.id, veterinarioId: maria.id, tipoConsulta: "Consulta General", motivo: "Revisión periódica", estado: "CANCELADA" },
      { codigo: codigoCita(1, 2), fechaHora: enFecha(1, 10, 30), duracionMin: 30, mascotaId: billy.id, veterinarioId: luis.id, tipoConsulta: "Consulta General", motivo: "Chequeo general", estado: "CONFIRMADA" },
    ],
  });

  // --- Controles preventivos --------------------------------------------------
  const hoy = todayISO();
  await prisma.controlPreventivo.createMany({
    data: [
      { mascotaId: coco.id, tipo: "VACUNA", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -360)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 5)) },
      { mascotaId: rally.id, tipo: "DESPARASITACION", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -60)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 25)) },
      { mascotaId: billy.id, tipo: "VACUNA", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -395)), proximaDosis: literalDateOnlyToDate(addDays(hoy, -15)) },
      { mascotaId: tom.id, tipo: "DESPARASITACION", fechaAplicacion: literalDateOnlyToDate(addDays(hoy, -30)), proximaDosis: literalDateOnlyToDate(addDays(hoy, 60)) },
    ],
  });

  // --- Medicamentos (dos quedan bajo el mínimo a propósito, para HU9) ------
  await prisma.medicamento.createMany({
    data: [
      { nombre: "Amoxicilina 250mg", stockActual: 40, stockMinimo: 10 },
      { nombre: "Meloxicam (antiinflamatorio)", stockActual: 6, stockMinimo: 8 },
      { nombre: "Shampoo medicado dermatológico", stockActual: 15, stockMinimo: 5 },
      { nombre: "Vacuna antirrábica", stockActual: 20, stockMinimo: 10 },
      { nombre: "Desparasitante interno (tableta)", stockActual: 3, stockMinimo: 10 },
    ],
  });

  // --- Atenciones médicas (variedad de fechas/tipoServicio para HU7/HU8) ------
  const atencionesData = [
    { mascotaId: coco.id, veterinarioId: luis.id, fecha: hace(0), tipoServicio: "Consulta General", diagnostico: "Dermatitis leve", tratamiento: "Shampoo medicado por 2 semanas", examenesExternos: "", montoConsulta: 120, estadoPago: "PENDIENTE" as const },
    { mascotaId: billy.id, veterinarioId: carlos.id, fecha: hace(0), tipoServicio: "Vacunación", diagnostico: "Aplicación de vacuna antirrábica", tratamiento: "Ninguno adicional, control en 1 año", examenesExternos: "", montoConsulta: 80, estadoPago: "PENDIENTE" as const },
    { mascotaId: tom.id, veterinarioId: luis.id, fecha: hace(0), tipoServicio: "Control", diagnostico: "Control post-operatorio", tratamiento: "Reposo, retirar puntos en 7 días", examenesExternos: "", montoConsulta: 150, estadoPago: "PENDIENTE" as const },
    { mascotaId: rally.id, veterinarioId: luis.id, fecha: hace(30), tipoServicio: "Consulta General", diagnostico: "Chequeo general sin hallazgos", tratamiento: "Ninguno, control en 6 meses", examenesExternos: "", montoConsulta: 100, estadoPago: "PAGADO" as const },
    { mascotaId: coco.id, veterinarioId: carlos.id, fecha: hace(45), tipoServicio: "Vacunación", diagnostico: "Vacuna antirrábica anual", tratamiento: "Ninguno adicional", examenesExternos: "", montoConsulta: 90, estadoPago: "PAGADO" as const },
    { mascotaId: billy.id, veterinarioId: maria.id, fecha: hace(20), tipoServicio: "Cirugía", diagnostico: "Tumor benigno en piel", tratamiento: "Extracción quirúrgica menor, control de puntos en 10 días", examenesExternos: "Biopsia enviada a laboratorio externo", montoConsulta: 350, estadoPago: "PAGADO" as const },
    { mascotaId: tommy.id, veterinarioId: luis.id, fecha: hace(10), tipoServicio: "Desparasitación", diagnostico: "Desparasitación programada", tratamiento: "Tableta desparasitante interna", examenesExternos: "", montoConsulta: 60, estadoPago: "PAGADO" as const },
    { mascotaId: rally.id, veterinarioId: luis.id, fecha: hace(5), tipoServicio: "Control", diagnostico: "Control post-vacuna, sin reacciones", tratamiento: "Ninguno", examenesExternos: "", montoConsulta: 70, estadoPago: "PAGADO" as const },
    { mascotaId: tom.id, veterinarioId: carlos.id, fecha: hace(3), tipoServicio: "Consulta General", diagnostico: "Vómitos ocasionales, sin signos de alarma", tratamiento: "Dieta blanda por 3 días", examenesExternos: "", montoConsulta: 130, estadoPago: "PAGADO" as const },
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
  console.log("  admin / admin123            (ADMINISTRADOR)");
  console.log("  veterinario / vet123         (VETERINARIO — Luis Fernández)");
  console.log("  carlos.andrade / vet123      (VETERINARIO — Carlos Andrade)");
  console.log("  maria.rodriguez / vet123     (VETERINARIO — María Rodríguez)");
  console.log("  recepcion / recepcion123     (RECEPCIONISTA)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
