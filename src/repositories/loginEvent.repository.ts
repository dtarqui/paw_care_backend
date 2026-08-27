import { prisma } from "../lib/prisma";
import { LoginEvent, LoginOutcome, Paginated } from "../types";
import { dateToLiteral } from "../utils/date";

export interface NewLoginEvent {
  /** Ausente si el nombre de usuario tecleado no corresponde a ninguna cuenta. */
  userId?: number;
  username: string;
  outcome: LoginOutcome;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginEventFilters {
  /** Sin filtro, todos; `false` deja solo los intentos fallidos. */
  successful?: boolean;
  username?: string;
}

export const loginEventRepository = {
  async record(input: NewLoginEvent): Promise<void> {
    await prisma.loginEvent.create({ data: input });
  },

  async findAllPaginated(
    page: number,
    pageSize: number,
    filters: LoginEventFilters = {}
  ): Promise<Paginated<LoginEvent>> {
    const where = {
      ...(filters.successful === true ? { outcome: "SUCCESS" as const } : {}),
      ...(filters.successful === false ? { outcome: { not: "SUCCESS" as const } } : {}),
      ...(filters.username ? { username: { contains: filters.username, mode: "insensitive" as const } } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.loginEvent.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { firstName: true, paternalLastName: true, role: true } } },
      }),
      prisma.loginEvent.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        user: row.user
          ? { firstName: row.user.firstName, paternalLastName: row.user.paternalLastName, role: row.user.role }
          : undefined,
        username: row.username,
        outcome: row.outcome,
        ipAddress: row.ipAddress ?? undefined,
        userAgent: row.userAgent ?? undefined,
        date: dateToLiteral(row.date),
      })),
      total,
      page,
      pageSize,
    };
  },

  /** Resumen para la cabecera de la pantalla: cuántos ingresos y cuántos fallos hubo
   * en las últimas `hours` horas. Responde de un vistazo "¿alguien estuvo probando
   * contraseñas anoche?", que es la razón por la que se mira esta pantalla. */
  async summarySince(hours: number): Promise<{ successes: number; failures: number }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const [successes, failures] = await Promise.all([
      prisma.loginEvent.count({ where: { date: { gte: since }, outcome: "SUCCESS" } }),
      prisma.loginEvent.count({ where: { date: { gte: since }, outcome: { not: "SUCCESS" } } }),
    ]);
    return { successes, failures };
  },
};
