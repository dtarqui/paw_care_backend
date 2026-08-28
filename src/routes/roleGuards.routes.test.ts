process.env.DEMO_DELAY_MS = "0";

import bcrypt from "bcryptjs";
import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { authService } from "../services/auth.service";
import { Role } from "../types";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const app = createApp();

/**
 * Las rutas que solo puede tocar un Administrador. Este test existe porque el frontend
 * dejó de ser la única defensa: el sidebar oculta lo que no corresponde y el ruteo
 * también lo impide, pero **ninguna de las dos cosas es el guarda de verdad** —
 * cualquiera puede llamar a la API sin pasar por la aplicación.
 *
 * Un endpoint administrativo nuevo se agrega acá en la misma tanda que en
 * `routes/index.ts`; si alguien olvida el `requireRole("ADMIN")`, esto lo dice.
 */
const ADMIN_ONLY: [method: "get" | "post" | "patch" | "delete", path: string][] = [
  ["get", "/api/users"],
  ["post", "/api/users"],
  ["patch", "/api/users/1/status"],
  ["patch", "/api/users/1/role"],
  ["patch", "/api/users/1/password"],
  ["get", "/api/users/invitations"],
  ["post", "/api/users/invitations"],
  ["delete", "/api/users/invitations/1"],
  ["get", "/api/audit-logs"],
  ["get", "/api/login-events"],
  ["get", "/api/reports"],
  ["get", "/api/reports/revenue"],
  ["get", "/api/reports/export/excel"],
  ["get", "/api/reports/export/pdf"],
  ["get", "/api/medications"],
  ["get", "/api/medications/low-stock"],
  ["get", "/api/medications/expiring"],
  ["get", "/api/medications/1/batches"],
  ["post", "/api/medications"],
  ["patch", "/api/medications/1"],
  ["delete", "/api/medications/1"],
  ["post", "/api/medications/1/stock-entries"],
  ["get", "/api/exports/full"],
  ["post", "/api/imports/clients"],
];

/**
 * El token lo emite la propia aplicación, iniciando sesión de verdad.
 *
 * Firmarlo acá a mano obligaba a repetir el secreto, y repetirlo salió mal: el test
 * usaba un valor de respaldo distinto al del código. En la máquina de desarrollo no se
 * notaba —el `.env` define justo el mismo valor que usa el código cuando falta— pero
 * en CI, sin `.env`, los dos respaldos diferían: la firma no validaba y **todas** las
 * rutas respondían 401 en vez de 403. El test seguía en verde por el motivo
 * equivocado hasta que falló en CI.
 */
async function tokenFor(role: Role) {
  prismaMock.user.findUnique.mockResolvedValue({
    id: 1,
    username: "prueba",
    passwordHash: bcrypt.hashSync("clave123", 4),
    firstName: "Persona",
    paternalLastName: "De Prueba",
    maternalLastName: null,
    nationalId: "1234567",
    email: null,
    phone: null,
    address: null,
    role,
    status: "ACTIVE",
    selfRegistered: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const { token } = await authService.login("prueba", "clave123");
  return token;
}

describe("Rutas exclusivas de Administrador", () => {
  for (const role of ["VET", "RECEPTIONIST"] as const) {
    it(`rechaza con 403 a ${role} en todas`, async () => {
      const token = await tokenFor(role);

      for (const [method, path] of ADMIN_ONLY) {
        const res = await request(app)[method](path).set("Authorization", `Bearer ${token}`);
        expect({ path, status: res.status }).toEqual({ path, status: 403 });
      }
    });
  }

  it("rechaza con 401 sin token", async () => {
    for (const [method, path] of ADMIN_ONLY) {
      const res = await request(app)[method](path);
      expect({ path, status: res.status }).toEqual({ path, status: 401 });
    }
  });

  // Sin esto, el test de arriba pasaría igual si las rutas devolvieran 403 por
  // cualquier otro motivo — o si dejaran de existir. Acá el Administrador tiene que
  // pasar los dos guardas; lo que responda después (200, 400, 404, 500 por Prisma
  // mockeado) no importa.
  it("deja pasar los guardas a ADMIN en todas", async () => {
    const token = await tokenFor("ADMIN");

    for (const [method, path] of ADMIN_ONLY) {
      // Con Prisma mockeado, algunas de estas rutas (las que arman un archivo y lo
      // mandan como stream, o la que espera un .xlsx subido) revientan después del
      // guarda. Que revienten sirve igual: significa que el guarda las dejó pasar.
      const status = await request(app)
        [method](path)
        .set("Authorization", `Bearer ${token}`)
        .then((res) => res.status)
        .catch(() => 0);

      // Se comprueban los dos: un 401 significaría que el token no valía y el test
      // de los otros roles estaría midiendo otra cosa. Es exactamente lo que pasó.
      expect({ path, blocked: status === 403 || status === 401 }).toEqual({ path, blocked: false });
    }
  });
});
