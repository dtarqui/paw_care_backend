import bcrypt from "bcryptjs";
import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authService, InvalidCredentialsError } from "./auth.service";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

function fakeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 4),
    firstName: "Ana",
    paternalLastName: "García",
    maternalLastName: null,
    nationalId: "1234567",
    email: null,
    phone: null,
    address: null,
    role: "ADMIN",
    status: "ACTIVE",
    selfRegistered: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("authService.login", () => {
  it("devuelve token y usuario público con credenciales válidas", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser());

    const result = await authService.login("admin", "admin123");

    expect(result.token).toBeTruthy();
    expect(result.user.username).toBe("admin");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("rechaza una contraseña incorrecta", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser());

    await expect(authService.login("admin", "incorrecta")).rejects.toThrow(InvalidCredentialsError);
  });

  it("rechaza un usuario inexistente", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(authService.login("noexiste", "cualquiera")).rejects.toThrow(InvalidCredentialsError);
  });

  it("rechaza un usuario INACTIVE aunque la contraseña sea correcta", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser({ status: "INACTIVE" }));

    await expect(authService.login("admin", "admin123")).rejects.toThrow(InvalidCredentialsError);
  });
});
