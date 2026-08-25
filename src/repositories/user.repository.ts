import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { Paginated, RecordStatus, Role, User } from "../types";

type UserRow = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

function toDomain(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    firstName: row.firstName,
    paternalLastName: row.paternalLastName,
    maternalLastName: row.maternalLastName ?? undefined,
    nationalId: row.nationalId,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role as Role,
    status: row.status,
    selfRegistered: row.selfRegistered,
  };
}

export interface NewUserRecord {
  username: string;
  password: string; // texto plano de entrada — se hashea acá antes de guardar
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  nationalId: string;
  email?: string;
  phone?: string;
  role: Role;
  status?: RecordStatus; // default ACTIVE — usado en INACTIVE por el preregistro de veterinario
  selfRegistered?: boolean;
}

export const userRepository = {
  async findByUsername(username: string): Promise<User | undefined> {
    const row = await prisma.user.findUnique({ where: { username } });
    return row ? toDomain(row) : undefined;
  },

  async findById(id: number): Promise<User | undefined> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toDomain(row) : undefined;
  },

  async findByNationalId(nationalId: string): Promise<User | undefined> {
    const row = await prisma.user.findUnique({ where: { nationalId } });
    return row ? toDomain(row) : undefined;
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? toDomain(row) : undefined;
  },

  async findAll(): Promise<User[]> {
    const rows = await prisma.user.findMany({ orderBy: { id: "asc" } });
    return rows.map(toDomain);
  },

  async findAllPaginated(page: number, pageSize: number): Promise<Paginated<User>> {
    const [rows, total] = await Promise.all([
      prisma.user.findMany({ orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.user.count(),
    ]);
    return { items: rows.map(toDomain), total, page, pageSize };
  },

  async create(input: NewUserRecord): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const row = await prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        firstName: input.firstName,
        paternalLastName: input.paternalLastName,
        maternalLastName: input.maternalLastName,
        nationalId: input.nationalId,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: input.status ?? "ACTIVE",
        selfRegistered: input.selfRegistered ?? false,
      },
    });
    return toDomain(row);
  },

  async updateStatus(id: number, status: RecordStatus): Promise<User> {
    const row = await prisma.user.update({ where: { id }, data: { status } });
    return toDomain(row);
  },

  async updateRole(id: number, role: Role): Promise<User> {
    const row = await prisma.user.update({ where: { id }, data: { role } });
    return toDomain(row);
  },

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  },
};
