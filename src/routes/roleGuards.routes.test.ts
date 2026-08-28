process.env.DEMO_DELAY_MS = "0";

import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../app";
import { Role } from "../types";

jest.mock("../lib/prisma");

const app = createApp();

/**
 * Las rutas que solo puede tocar un Administrador. Este test existe porque el frontend
 * dejó de ser la única defensa: el sidebar oculta lo que no corresponde y ahora el
 * ruteo también lo impide, pero **ninguna de las dos cosas es el guarda de verdad** —
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
  ["post", "/api/medications"],
  ["patch", "/api/medications/1"],
  ["delete", "/api/medications/1"],
  ["post", "/api/medications/1/stock-entries"],
  ["get", "/api/exports/full"],
  ["post", "/api/imports/clients"],
];

function tokenFor(role: Role) {
  return jwt.sign({ sub: 1, role, name: "Prueba" }, process.env.JWT_SECRET ?? "pawcare-dev-secret", {
    expiresIn: "8h",
  });
}

describe("Rutas exclusivas de Administrador", () => {
  for (const role of ["VET", "RECEPTIONIST"] as const) {
    it(`rechaza con 403 a ${role} en todas`, async () => {
      const token = tokenFor(role);

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
  // pasar el guarda; lo que responda después (200, 400, 404, 500 por Prisma mockeado)
  // no importa, lo que importa es que no sea 403.
  it("deja pasar el guarda a ADMIN en todas", async () => {
    const token = tokenFor("ADMIN");

    for (const [method, path] of ADMIN_ONLY) {
      // Con Prisma mockeado, algunas de estas rutas (las que arman un archivo y lo
      // mandan como stream, o la que espera un .xlsx subido) revientan después del
      // guarda. Que revienten sirve igual: significa que el guarda las dejó pasar.
      const status = await request(app)
        [method](path)
        .set("Authorization", `Bearer ${token}`)
        .then((res) => res.status)
        .catch(() => 0);
      expect({ path, forbidden: status === 403 }).toEqual({ path, forbidden: false });
    }
  });
});
