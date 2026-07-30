import ExcelJS from "exceljs";
import { atencionRepository } from "../repositories/atencion.repository";
import { citaRepository } from "../repositories/cita.repository";
import { controlPreventivoRepository } from "../repositories/controlPreventivo.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { medicamentoRepository } from "../repositories/medicamento.repository";
import { pagoRepository } from "../repositories/pago.repository";
import { propietarioRepository } from "../repositories/propietario.repository";
import { usuarioRepository } from "../repositories/usuario.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";

function hoja(workbook: ExcelJS.Workbook, nombre: string, columnas: Partial<ExcelJS.Column>[], filas: readonly unknown[]) {
  const sheet = workbook.addWorksheet(nombre);
  sheet.columns = columnas;
  sheet.addRows(filas as Record<string, unknown>[]);
  sheet.getRow(1).font = { bold: true };
}

/** HU15 — un archivo con una hoja por entidad, para que el dueño de la clínica
 * pueda llevarse todos sus datos en cualquier momento (sin depender del proveedor). */
export async function generarExportacionCompleta(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  const [usuarios, veterinarios, propietarios, mascotas, citas, atenciones, pagos, controles, medicamentos] = await Promise.all([
    usuarioRepository.findAll(),
    veterinarioRepository.findAll(),
    propietarioRepository.findAll(),
    mascotaRepository.findAll(),
    citaRepository.findAll(),
    atencionRepository.findAll(),
    pagoRepository.findAllRaw(),
    controlPreventivoRepository.findAll(),
    medicamentoRepository.findAll(),
  ]);

  hoja(
    workbook,
    "Usuarios",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Apellido Paterno", key: "apellidoPaterno", width: 20 },
      { header: "CI", key: "ci", width: 14 },
      { header: "Usuario", key: "username", width: 16 },
      { header: "Rol", key: "rol", width: 16 },
      { header: "Estado", key: "estado", width: 12 },
    ],
    usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      apellidoPaterno: u.apellidoPaterno,
      ci: u.ci,
      username: u.username,
      rol: u.rol,
      estado: u.estado,
    }))
  );

  hoja(
    workbook,
    "Veterinarios",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Apellido Paterno", key: "apellidoPaterno", width: 20 },
      { header: "Matrícula", key: "matricula", width: 14 },
      { header: "Especialidad", key: "especialidad", width: 22 },
    ],
    veterinarios
  );

  hoja(
    workbook,
    "Propietarios",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Apellido Paterno", key: "apellidoPaterno", width: 20 },
      { header: "CI", key: "ci", width: 14 },
      { header: "Teléfono", key: "telefono", width: 14 },
    ],
    propietarios
  );

  hoja(
    workbook,
    "Mascotas",
    [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "nombre", width: 18 },
      { header: "Especie", key: "especie", width: 12 },
      { header: "Raza", key: "raza", width: 18 },
      { header: "Sexo", key: "sexo", width: 10 },
      { header: "Propietario", key: "propietario", width: 25 },
    ],
    mascotas.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      especie: m.especie,
      raza: m.raza,
      sexo: m.sexo,
      propietario: `${m.propietario.nombre} ${m.propietario.apellidoPaterno}`,
    }))
  );

  hoja(
    workbook,
    "Citas",
    [
      { header: "Código", key: "codigo", width: 20 },
      { header: "Fecha/Hora", key: "fechaHora", width: 20 },
      { header: "Mascota", key: "mascota", width: 18 },
      { header: "Veterinario", key: "veterinario", width: 22 },
      { header: "Tipo", key: "tipoConsulta", width: 18 },
      { header: "Estado", key: "estado", width: 14 },
    ],
    citas.map((c) => ({
      codigo: c.codigo,
      fechaHora: `${c.fechaHora.slice(0, 10)} ${c.fechaHora.slice(11, 16)}`,
      mascota: c.mascota.nombre,
      veterinario: `${c.veterinario.nombre} ${c.veterinario.apellidoPaterno}`,
      tipoConsulta: c.tipoConsulta,
      estado: c.estado,
    }))
  );

  const mascotaPorId = new Map(mascotas.map((m) => [m.id, m]));
  const veterinarioPorId = new Map(veterinarios.map((v) => [v.id, v]));

  hoja(
    workbook,
    "AtencionesMedicas",
    [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Mascota", key: "mascota", width: 18 },
      { header: "Veterinario", key: "veterinario", width: 22 },
      { header: "Tipo de servicio", key: "tipoServicio", width: 18 },
      { header: "Diagnóstico", key: "diagnostico", width: 30 },
      { header: "Monto (Bs.)", key: "montoConsulta", width: 14 },
      { header: "Estado de pago", key: "estadoPago", width: 16 },
    ],
    atenciones.map((a) => {
      const mascota = mascotaPorId.get(a.mascotaId);
      const veterinario = veterinarioPorId.get(a.veterinarioId);
      return {
        fecha: a.fecha.slice(0, 10),
        mascota: mascota?.nombre ?? "—",
        veterinario: veterinario ? `${veterinario.nombre} ${veterinario.apellidoPaterno}` : "—",
        tipoServicio: a.tipoServicio,
        diagnostico: a.diagnostico,
        montoConsulta: a.montoConsulta,
        estadoPago: a.estadoPago,
      };
    })
  );

  hoja(
    workbook,
    "Pagos",
    [
      { header: "Atención", key: "atencionId", width: 12 },
      { header: "Método de pago", key: "metodoPago", width: 16 },
      { header: "Monto (Bs.)", key: "monto", width: 14 },
      { header: "Fecha", key: "fecha", width: 14 },
    ],
    pagos.map((p) => ({
      atencionId: p.atencionId,
      metodoPago: p.metodoPago,
      monto: p.monto,
      fecha: p.fecha.slice(0, 10),
    }))
  );

  hoja(
    workbook,
    "ControlesPreventivos",
    [
      { header: "Mascota", key: "mascota", width: 18 },
      { header: "Tipo", key: "tipo", width: 16 },
      { header: "Fecha aplicación", key: "fechaAplicacion", width: 16 },
      { header: "Próxima dosis", key: "proximaDosis", width: 16 },
    ],
    controles.map((c) => ({
      mascota: mascotaPorId.get(c.mascotaId)?.nombre ?? "—",
      tipo: c.tipo,
      fechaAplicacion: c.fechaAplicacion,
      proximaDosis: c.proximaDosis,
    }))
  );

  hoja(
    workbook,
    "Medicamentos",
    [
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "Stock actual", key: "stockActual", width: 14 },
      { header: "Stock mínimo", key: "stockMinimo", width: 14 },
    ],
    medicamentos
  );

  return workbook;
}
