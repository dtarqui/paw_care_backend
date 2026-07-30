import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { Rol, Usuario } from "../types";

type UsuarioRow = NonNullable<Awaited<ReturnType<typeof prisma.usuario.findUnique>>>;

function aDominio(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    username: row.username,
    password: row.passwordHash, // hash de bcrypt — nunca texto plano (ver auth.service.ts)
    nombre: row.nombre,
    apellidoPaterno: row.apellidoPaterno,
    apellidoMaterno: row.apellidoMaterno ?? undefined,
    ci: row.ci,
    telefono: row.telefono ?? undefined,
    rol: row.rol as Rol,
    estado: row.estado,
  };
}

export interface NuevoUsuarioRegistro {
  username: string;
  password: string; // texto plano de entrada — se hashea acá antes de guardar
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  ci: string;
  telefono?: string;
  rol: Rol;
}

export const usuarioRepository = {
  async findByUsername(username: string): Promise<Usuario | undefined> {
    const row = await prisma.usuario.findUnique({ where: { username } });
    return row ? aDominio(row) : undefined;
  },

  async findById(id: number): Promise<Usuario | undefined> {
    const row = await prisma.usuario.findUnique({ where: { id } });
    return row ? aDominio(row) : undefined;
  },

  async findByCi(ci: string): Promise<Usuario | undefined> {
    const row = await prisma.usuario.findUnique({ where: { ci } });
    return row ? aDominio(row) : undefined;
  },

  async findAll(): Promise<Usuario[]> {
    const rows = await prisma.usuario.findMany({ orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  async create(input: NuevoUsuarioRegistro): Promise<Usuario> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const row = await prisma.usuario.create({
      data: {
        username: input.username,
        passwordHash,
        nombre: input.nombre,
        apellidoPaterno: input.apellidoPaterno,
        apellidoMaterno: input.apellidoMaterno,
        ci: input.ci,
        telefono: input.telefono,
        rol: input.rol,
        estado: "ACTIVO",
      },
    });
    return aDominio(row);
  },
};
