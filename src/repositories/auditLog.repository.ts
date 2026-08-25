import { prisma } from "../lib/prisma";
import { AuditAction, AuditLog, Paginated } from "../types";
import { dateToLiteral } from "../utils/date";

export interface NewAuditLogRecord {
  actorId?: number;
  action: AuditAction;
  entityType: string;
  entityId?: number;
  details?: string;
}

export const auditLogRepository = {
  async record(input: NewAuditLogRecord): Promise<void> {
    await prisma.auditLog.create({ data: input });
  },

  async findAllPaginated(page: number, pageSize: number): Promise<Paginated<AuditLog>> {
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { firstName: true, paternalLastName: true } } },
      }),
      prisma.auditLog.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        actor: row.actor
          ? { firstName: row.actor.firstName, paternalLastName: row.actor.paternalLastName }
          : undefined,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId ?? undefined,
        details: row.details ?? undefined,
        date: dateToLiteral(row.date),
      })),
      total,
      page,
      pageSize,
    };
  },
};
