import bcrypt from "bcryptjs";
import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authService, InvalidCredentialsError } from "./auth.service";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
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

/** Lo que se guardó en `st_login_events` en la última llamada. */
function recordedEvent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prismaMock.loginEvent.create as any).mock.calls.at(-1)?.[0]?.data;
}

const CONTEXT = { ipAddress: "190.129.1.20", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140" };

describe("registro de intentos de inicio de sesión", () => {
  beforeEach(() => jest.clearAllMocks());

  it("guarda el ingreso exitoso con usuario, IP y navegador", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser());

    await authService.login("admin", "admin123", CONTEXT);

    expect(recordedEvent()).toEqual({
      userId: 7,
      username: "admin",
      outcome: "SUCCESS",
      ipAddress: "190.129.1.20",
      userAgent: CONTEXT.userAgent,
    });
  });

  it("guarda el intento con contraseña incorrecta, vinculado a la cuenta", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser());

    await expect(authService.login("admin", "mala", CONTEXT)).rejects.toThrow(InvalidCredentialsError);

    expect(recordedEvent()).toMatchObject({ userId: 7, username: "admin", outcome: "INVALID_CREDENTIALS" });
  });

  it("guarda el intento contra un usuario inexistente, sin vincularlo a ninguna cuenta", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(authService.login("intruso", "loquesea", CONTEXT)).rejects.toThrow(InvalidCredentialsError);

    expect(recordedEvent()).toMatchObject({ userId: undefined, username: "intruso", outcome: "INVALID_CREDENTIALS" });
  });

  it("distingue una cuenta desactivada, aunque el usuario reciba el mismo error genérico", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser({ status: "INACTIVE" }));

    await expect(authService.login("admin", "admin123", CONTEXT)).rejects.toThrow(InvalidCredentialsError);

    expect(recordedEvent()).toMatchObject({ userId: 7, outcome: "INACTIVE_ACCOUNT" });
  });

  it("deja entrar aunque falle el registro del intento — la bitácora no bloquea el login", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser());
    (prismaMock.loginEvent.create as jest.Mock).mockRejectedValueOnce(new Error("base caída"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await authService.login("admin", "admin123", CONTEXT);

    expect(result.token).toBeTruthy();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
