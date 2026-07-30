import { Cita } from "../types";
import { mascotas } from "./mascotas.data";
import { veterinarios } from "./veterinarios.data";

// Construye el ISO string a mano (en vez de Date.setHours + toISOString) para que la
// hora quede fija tal como se indica, sin importar la zona horaria del servidor donde
// corra el proceso. citaRepository compara horas por el substring de este string, y
// POST /api/citas guarda la hora de la misma forma directa — así ambos quedan alineados.
function enFecha(diasDesdeHoy: number, hora: number, minuto: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(hora).padStart(2, "0");
  const min = String(minuto).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00.000Z`;
}

function codigo(diasDesdeHoy: number, secuencia: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `CITA-${yyyy}${mm}${dd}-${String(secuencia).padStart(3, "0")}`;
}

// Se recalculan relativas a "hoy" cada vez que arranca el servidor, para que la demo
// siempre luzca con fechas vigentes sin importar cuándo se ejecute.
export const citas: Cita[] = [
  {
    id: 1,
    codigo: codigo(0, 1),
    fechaHora: enFecha(0, 9, 0),
    duracionMin: 30,
    mascota: { id: 3, nombre: mascotas[2].nombre, especie: mascotas[2].especie },
    veterinario: { id: 2, nombre: veterinarios[1].nombre, apellidoPaterno: veterinarios[1].apellidoPaterno },
    tipoConsulta: "Consulta General",
    motivo: "Revisión rutinaria",
    estado: "CONFIRMADA",
  },
  {
    id: 2,
    codigo: codigo(0, 2),
    fechaHora: enFecha(0, 9, 30),
    duracionMin: 30,
    mascota: { id: 4, nombre: mascotas[3].nombre, especie: mascotas[3].especie },
    veterinario: { id: 1, nombre: veterinarios[0].nombre, apellidoPaterno: veterinarios[0].apellidoPaterno },
    tipoConsulta: "Vacunación",
    motivo: "Vacuna antirrábica",
    estado: "CONFIRMADA",
  },
  {
    id: 3,
    codigo: codigo(0, 3),
    fechaHora: enFecha(0, 11, 0),
    duracionMin: 45,
    mascota: { id: 1, nombre: mascotas[0].nombre, especie: mascotas[0].especie },
    veterinario: { id: 2, nombre: veterinarios[1].nombre, apellidoPaterno: veterinarios[1].apellidoPaterno },
    tipoConsulta: "Control",
    motivo: "Revisión de piel",
    estado: "ATENDIDA",
  },
  {
    id: 4,
    codigo: codigo(1, 1),
    fechaHora: enFecha(1, 9, 0),
    duracionMin: 30,
    mascota: { id: 5, nombre: mascotas[4].nombre, especie: mascotas[4].especie },
    veterinario: { id: 3, nombre: veterinarios[2].nombre, apellidoPaterno: veterinarios[2].apellidoPaterno },
    tipoConsulta: "Consulta General",
    motivo: "Revisión periódica",
    estado: "CANCELADA",
  },
  {
    id: 5,
    codigo: codigo(1, 2),
    fechaHora: enFecha(1, 10, 30),
    duracionMin: 30,
    mascota: { id: 2, nombre: mascotas[1].nombre, especie: mascotas[1].especie },
    veterinario: { id: 2, nombre: veterinarios[1].nombre, apellidoPaterno: veterinarios[1].apellidoPaterno },
    tipoConsulta: "Consulta General",
    motivo: "Chequeo general",
    estado: "CONFIRMADA",
  },
];

// Horario de atención estándar usado para calcular disponibilidad en el demo (Horario en el modelo real).
export const BLOQUES_HORARIO = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00",
];
