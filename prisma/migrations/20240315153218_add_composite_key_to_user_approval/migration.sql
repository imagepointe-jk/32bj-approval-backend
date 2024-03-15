/*
  Warnings:

  - The primary key for the `UserApproval` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "UserApproval" DROP CONSTRAINT "UserApproval_pkey",
ADD CONSTRAINT "UserApproval_pkey" PRIMARY KEY ("userId", "orderId");
