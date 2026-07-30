import { TipoMovimientoInventario } from "../types";

export interface MovimientoRegistro {
  id: number;
  medicamentoId: number;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  fecha: string;
  atencionId?: number;
}

export const movimientosInventario: MovimientoRegistro[] = [];
