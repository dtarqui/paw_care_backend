process.env.DEMO_DELAY_MS = "0";

import bcrypt from "bcryptjs";
import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const app = createApp();

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

describe("POST /api/auth/login (end-to-end contra la app real, Prisma mockeado)", () => {
  it("responde 200 con token para credenciales válidas", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioFalso());

    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("responde 401 con credenciales inválidas", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioFalso());

    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "mala" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it("responde 401 en una ruta protegida sin token", async () => {
    const res = await request(app).get("/api/mascotas");
    expect(res.status).toBe(401);
  });

  it("responde 403 en una ruta de solo-Administrador con un rol distinto", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioFalso({ rol: "RECEPCIONISTA" }));
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });

    const res = await request(app).get("/api/usuarios").set("Authorization", `Bearer ${login.body.token}`);

    expect(res.status).toBe(403);
  });
});
