import { auditLogRepository } from "../repositories/auditLog.repository";

export const auditLogService = {
  list(page = 1, pageSize = 20) {
    return auditLogRepository.findAllPaginated(page, pageSize);
  },
};
