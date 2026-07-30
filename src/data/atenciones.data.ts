import { EstadoPagoAtencion } from "../types";

export interface AtencionRegistro {
  id: number;
  mascotaId: number;
  veterinarioId: number;
  fecha: string; // ISO
  tipoServicio: string;
  diagnostico: string;
  tratamiento: string;
  examenesExternos: string;
  montoConsulta: number;
  estadoPago: EstadoPagoAtencion;
}

function hace(dias: number): string {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
}

// Las primeras 3 (PENDIENTE) alimentan el módulo de Pagos (HU4). Las siguientes 5
// (PAGADO, con fechas repartidas en los últimos 45 días) le dan a los reportes
// financieros (HU7/HU8) suficiente historial y variedad de tipoServicio para
// mostrar un gráfico real desde el primer arranque — ver pagos.data.ts para el
// ledger de Pago correspondiente a cada una.
export const atenciones: AtencionRegistro[] = [
  {
    id: 1,
    mascotaId: 1, // Coco
    veterinarioId: 2,
    fecha: hace(0),
    tipoServicio: "Consulta General",
    diagnostico: "Dermatitis leve",
    tratamiento: "Shampoo medicado por 2 semanas",
    examenesExternos: "",
    montoConsulta: 120,
    estadoPago: "PENDIENTE",
  },
  {
    id: 2,
    mascotaId: 2, // Billy
    veterinarioId: 1,
    fecha: hace(0),
    tipoServicio: "Vacunación",
    diagnostico: "Aplicación de vacuna antirrábica",
    tratamiento: "Ninguno adicional, control en 1 año",
    examenesExternos: "",
    montoConsulta: 80,
    estadoPago: "PENDIENTE",
  },
  {
    id: 3,
    mascotaId: 4, // Tom
    veterinarioId: 2,
    fecha: hace(0),
    tipoServicio: "Control",
    diagnostico: "Control post-operatorio",
    tratamiento: "Reposo, retirar puntos en 7 días",
    examenesExternos: "",
    montoConsulta: 150,
    estadoPago: "PENDIENTE",
  },
  {
    id: 4,
    mascotaId: 3, // Rally
    veterinarioId: 2,
    fecha: hace(30),
    tipoServicio: "Consulta General",
    diagnostico: "Chequeo general sin hallazgos",
    tratamiento: "Ninguno, control en 6 meses",
    examenesExternos: "",
    montoConsulta: 100,
    estadoPago: "PAGADO",
  },
  {
    id: 5,
    mascotaId: 1, // Coco
    veterinarioId: 1,
    fecha: hace(45),
    tipoServicio: "Vacunación",
    diagnostico: "Vacuna antirrábica anual",
    tratamiento: "Ninguno adicional",
    examenesExternos: "",
    montoConsulta: 90,
    estadoPago: "PAGADO",
  },
  {
    id: 6,
    mascotaId: 2, // Billy
    veterinarioId: 3,
    fecha: hace(20),
    tipoServicio: "Cirugía",
    diagnostico: "Tumor benigno en piel",
    tratamiento: "Extracción quirúrgica menor, control de puntos en 10 días",
    examenesExternos: "Biopsia enviada a laboratorio externo",
    montoConsulta: 350,
    estadoPago: "PAGADO",
  },
  {
    id: 7,
    mascotaId: 5, // Tommy
    veterinarioId: 2,
    fecha: hace(10),
    tipoServicio: "Desparasitación",
    diagnostico: "Desparasitación programada",
    tratamiento: "Tableta desparasitante interna",
    examenesExternos: "",
    montoConsulta: 60,
    estadoPago: "PAGADO",
  },
  {
    id: 8,
    mascotaId: 3, // Rally
    veterinarioId: 2,
    fecha: hace(5),
    tipoServicio: "Control",
    diagnostico: "Control post-vacuna, sin reacciones",
    tratamiento: "Ninguno",
    examenesExternos: "",
    montoConsulta: 70,
    estadoPago: "PAGADO",
  },
  {
    id: 9,
    mascotaId: 4, // Tom
    veterinarioId: 1,
    fecha: hace(3),
    tipoServicio: "Consulta General",
    diagnostico: "Vómitos ocasionales, sin signos de alarma",
    tratamiento: "Dieta blanda por 3 días",
    examenesExternos: "",
    montoConsulta: 130,
    estadoPago: "PAGADO",
  },
];
