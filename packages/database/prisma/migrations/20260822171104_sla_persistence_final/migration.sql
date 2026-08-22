-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "firstResponseAtRiskAt" TIMESTAMP(3),
ADD COLUMN     "firstResponseBreached" BOOLEAN,
ADD COLUMN     "resolutionAtRiskAt" TIMESTAMP(3),
ADD COLUMN     "resolutionBreached" BOOLEAN;
