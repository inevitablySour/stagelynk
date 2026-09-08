import { prisma } from "../src/lib/db";
import { getLogger } from "../src/lib/logger";
import { pruneExpiredAuditLogs } from "../src/lib/audit-log";

const log = getLogger("prune-audit-logs");

async function main() {
  const result = await pruneExpiredAuditLogs();
  log.info({ deletedCount: result.count }, "Pruned expired audit logs");
}

main()
  .catch((error) => {
    log.error({ err: error }, "Failed to prune expired audit logs");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
