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

describe("POST /api/auth/login (end-to-end contra la app real, Prisma mockeado)", () => {
  it("responde 200 con token para credenciales válidas", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser());

    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("responde 401 con credenciales inválidas", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser());

    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "mala" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it("responde 401 en una ruta protegida sin token", async () => {
    const res = await request(app).get("/api/pets");
    expect(res.status).toBe(401);
  });

  it("responde 403 en una ruta de solo-Administrador con un rol distinto", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser({ role: "RECEPTIONIST" }));
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });

    const res = await request(app).get("/api/users").set("Authorization", `Bearer ${login.body.token}`);

    expect(res.status).toBe(403);
  });
});
