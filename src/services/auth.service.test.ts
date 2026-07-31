import bcrypt from "bcryptjs";
import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authService, CredencialesInvalidasError } from "./auth.service";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

function usuarioFalso(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 4),
    nombre: "Ana",
    apellidoPaterno: "García",
    apellidoMaterno: null,
    ci: "1234567",
    telefono: null,
    direccion: null,
    rol: "ADMINISTRADOR",
    estado: "ACTIVO",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("authService.login", () => {
  it("devuelve token y usuario público con credenciales válidas", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioFalso());

    const resultado = await authService.login("admin", "admin123");

    expect(resultado.token).toBeTruthy();
    expect(resultado.usuario.username).toBe("admin");
    expect(resultado.usuario).not.toHaveProperty("password");
  });

  it("rechaza una contraseña incorrecta", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioFalso());

    await expect(authService.login("admin", "incorrecta")).rejects.toThrow(CredencialesInvalidasError);
  });

  it("rechaza un usuario inexistente", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    await expect(authService.login("noexiste", "cualquiera")).rejects.toThrow(CredencialesInvalidasError);
  });

  it("rechaza un usuario INACTIVO aunque la contraseña sea correcta", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioFalso({ estado: "INACTIVO" }));

    await expect(authService.login("admin", "admin123")).rejects.toThrow(CredencialesInvalidasError);
  });
});
