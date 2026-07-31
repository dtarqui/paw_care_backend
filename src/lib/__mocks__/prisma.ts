import { PrismaClient } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";

// Mock manual de src/lib/prisma.ts — se activa con jest.mock("../lib/prisma")
// (o la ruta relativa equivalente) en cada archivo de test. Los tests castean
// el import a DeepMockProxy<PrismaClient> para usar .mockResolvedValue, etc.
export const prisma = mockDeep<PrismaClient>();
