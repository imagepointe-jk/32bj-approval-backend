/*
  Warnings:

  - You are about to drop the `_OrderToUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `accessCode` on the `Order` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "_OrderToUser_B_index";

-- DropIndex
DROP INDEX "_OrderToUser_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_OrderToUser";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "AccessCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccessCode_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wcOrderId" INTEGER NOT NULL
);
INSERT INTO "new_Order" ("id", "wcOrderId") SELECT "id", "wcOrderId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "AccessCode_code_key" ON "AccessCode"("code");
