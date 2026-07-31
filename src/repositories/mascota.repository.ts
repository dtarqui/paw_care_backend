import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { CambioMascota, EstadoRegistro, Mascota, Paginado } from "../types";
import { dateOnlyToLiteral, dateToLiteral, literalDateOnlyToDate } from "../utils/date";

const include = { propietario: true } satisfies Prisma.MascotaInclude;
type MascotaRow = Prisma.MascotaGetPayload<{ include: typeof include }>;

function aDominio(row: MascotaRow): Mascota {
  return {
    id: row.id,
    nombre: row.nombre,
    especie: row.especie,
    raza: row.raza ?? "",
    sexo: (row.sexo as "Macho" | "Hembra") ?? "Macho",
    fechaNacimiento: row.fechaNacimiento ? dateOnlyToLiteral(row.fechaNacimiento) : "",
    peso: row.peso ? Number(row.peso) : 0,
    estado: row.estado,
    propietario: {
      id: row.propietario.id,
      nombre: row.propietario.nombre,
      apellidoPaterno: row.propietario.apellidoPaterno,
      ci: row.propietario.ci,
      telefono: row.propietario.telefono ?? "",
    },
  };
}

export interface NuevaMascotaRegistro {
  propietarioId: number;
  nombre: string;
  especie: string;
  raza?: string;
  sexo: "Macho" | "Hembra";
  fechaNacimiento?: string;
  peso?: number;
}

export const mascotaRepository = {
  async findAll(): Promise<Mascota[]> {
    const rows = await prisma.mascota.findMany({ include, orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  /** Para la pantalla de listado — a diferencia de `findAll()`, que se usa para
   * exportación completa y otros cálculos internos que necesitan el set entero.
   * Por defecto solo trae mascotas ACTIVO; `soloActivas: false` incluye también
   * las eliminadas (borrado lógico) para el toggle "Mostrar inactivas" de la UI. */
  async findAllPaginado(page: number, pageSize: number, soloActivas = true): Promise<Paginado<Mascota>> {
    const where = soloActivas ? { estado: "ACTIVO" as const } : {};
    const [rows, total] = await Promise.all([
      prisma.mascota.findMany({ where, include, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.mascota.count({ where }),
    ]);
    return { items: rows.map(aDominio), total, page, pageSize };
  },

  async actualizarEstado(id: number, estado: EstadoRegistro): Promise<Mascota> {
    const row = await prisma.mascota.update({ where: { id }, data: { estado }, include });
    return aDominio(row);
  },

  async findById(id: number): Promise<Mascota | undefined> {
    const row = await prisma.mascota.findUnique({ where: { id }, include });
    return row ? aDominio(row) : undefined;
  },

  async findByPropietarioCi(ci: string): Promise<Mascota[]> {
    const rows = await prisma.mascota.findMany({
      where: { propietario: { ci }, estado: "ACTIVO" },
      include,
      orderBy: { id: "asc" },
    });
    return rows.map(aDominio);
  },

  async existeParaPropietario(propietarioId: number, nombre: string, especie: string): Promise<boolean> {
    const row = await prisma.mascota.findFirst({
      where: {
        propietarioId,
        nombre: { equals: nombre, mode: "insensitive" },
        especie: { equals: especie, mode: "insensitive" },
      },
    });
    return !!row;
  },

  async create(input: NuevaMascotaRegistro): Promise<Mascota> {
    const row = await prisma.mascota.create({
      data: {
        propietarioId: input.propietarioId,
        nombre: input.nombre,
        especie: input.especie,
        raza: input.raza || null,
        sexo: input.sexo,
        fechaNacimiento: input.fechaNacimiento ? literalDateOnlyToDate(input.fechaNacimiento) : null,
        peso: input.peso || null,
      },
      include,
    });
    return aDominio(row);
  },

  async actualizar(id: number, cambios: Partial<NuevaMascotaRegistro>): Promise<Mascota> {
    const row = await prisma.mascota.update({
      where: { id },
      data: {
        ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
        ...(cambios.especie !== undefined ? { especie: cambios.especie } : {}),
        ...(cambios.raza !== undefined ? { raza: cambios.raza || null } : {}),
        ...(cambios.sexo !== undefined ? { sexo: cambios.sexo } : {}),
        ...(cambios.fechaNacimiento !== undefined
          ? { fechaNacimiento: cambios.fechaNacimiento ? literalDateOnlyToDate(cambios.fechaNacimiento) : null }
          : {}),
        ...(cambios.peso !== undefined ? { peso: cambios.peso || null } : {}),
      },
      include,
    });
    return aDominio(row);
  },

  /** Bitácora de ediciones manuales (no incluye los pesos registrados en una atención, ver atencion.repository.ts). */
  async registrarCambios(
    mascotaId: number,
    cambios: { campo: string; valorAnterior?: string; valorNuevo?: string }[],
    usuarioId?: number
  ): Promise<void> {
    if (cambios.length === 0) return;
    await prisma.cambioMascota.createMany({
      data: cambios.map((c) => ({
        mascotaId,
        campo: c.campo,
        valorAnterior: c.valorAnterior ?? null,
        valorNuevo: c.valorNuevo ?? null,
        usuarioId: usuarioId ?? null,
      })),
    });
  },

  async historialCambios(mascotaId: number): Promise<CambioMascota[]> {
    const rows = await prisma.cambioMascota.findMany({
      where: { mascotaId },
      include: { usuario: { select: { nombre: true, apellidoPaterno: true } } },
      orderBy: { fecha: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      campo: row.campo,
      valorAnterior: row.valorAnterior ?? undefined,
      valorNuevo: row.valorNuevo ?? undefined,
      fecha: dateToLiteral(row.fecha),
      usuario: row.usuario ? `${row.usuario.nombre} ${row.usuario.apellidoPaterno}` : undefined,
    }));
  },
};
