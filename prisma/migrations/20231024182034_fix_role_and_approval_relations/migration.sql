/*
  Warnings:

  - You are about to drop the `UserUserApproval` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserUserRole` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `orderId` to the `UserRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderId` to the `UserApproval` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserApproval` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserUserApproval";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserUserRole";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserRole" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserRole_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserRole" ("id", "role") SELECT "id", "role" FROM "UserRole";
DROP TABLE "UserRole";
ALTER TABLE "new_UserRole" RENAME TO "UserRole";
CREATE TABLE "new_UserApproval" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "approvalStatus" TEXT NOT NULL,
    CONSTRAINT "UserApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserApproval_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserApproval" ("approvalStatus", "id") SELECT "approvalStatus", "id" FROM "UserApproval";
DROP TABLE "UserApproval";
ALTER TABLE "new_UserApproval" RENAME TO "UserApproval";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
