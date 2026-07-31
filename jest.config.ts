import type { Config } from "jest";

// Sin base de datos de test dedicada: los tests mockean src/lib/prisma.ts
// (ver src/lib/__mocks__/prisma.ts), así corren rápido y sin tocar Supabase —
// apto para CI sin secretos.
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  clearMocks: true,
};

module.exports = config;
