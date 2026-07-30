import { AtencionRegistro, atenciones } from "../data/atenciones.data";

export const atencionRepository = {
  findAll(): AtencionRegistro[] {
    return [...atenciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  findByMascotaId(mascotaId: number): AtencionRegistro[] {
    return atenciones.filter((a) => a.mascotaId === mascotaId).sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  findById(id: number): AtencionRegistro | undefined {
    return atenciones.find((a) => a.id === id);
  },

  findPendientes(): AtencionRegistro[] {
    return atenciones.filter((a) => a.estadoPago === "PENDIENTE");
  },

  marcarPagada(id: number): void {
    const atencion = atenciones.find((a) => a.id === id);
    if (atencion) atencion.estadoPago = "PAGADO";
  },

  create(registro: AtencionRegistro): AtencionRegistro {
    atenciones.push(registro);
    return registro;
  },

  nextId(): number {
    return Math.max(0, ...atenciones.map((a) => a.id)) + 1;
  },
};
