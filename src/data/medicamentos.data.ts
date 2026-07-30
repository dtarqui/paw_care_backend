export interface MedicamentoRegistro {
  id: number;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
}

// Dos quedan a propósito por debajo del mínimo, para que la alerta de HU9 tenga algo que mostrar desde el arranque.
export const medicamentos: MedicamentoRegistro[] = [
  { id: 1, nombre: "Amoxicilina 250mg", stockActual: 40, stockMinimo: 10 },
  { id: 2, nombre: "Meloxicam (antiinflamatorio)", stockActual: 6, stockMinimo: 8 },
  { id: 3, nombre: "Shampoo medicado dermatológico", stockActual: 15, stockMinimo: 5 },
  { id: 4, nombre: "Vacuna antirrábica", stockActual: 20, stockMinimo: 10 },
  { id: 5, nombre: "Desparasitante interno (tableta)", stockActual: 3, stockMinimo: 10 },
];
