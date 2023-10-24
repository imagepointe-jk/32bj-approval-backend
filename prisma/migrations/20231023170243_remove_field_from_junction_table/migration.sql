/*
  Warnings:

  - You are about to drop the column `wcOrderId` on the `UserOrder` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    CONSTRAINT "UserOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserOrder" ("id", "orderId", "userId") SELECT "id", "orderId", "userId" FROM "UserOrder";
DROP TABLE "UserOrder";
ALTER TABLE "new_UserOrder" RENAME TO "UserOrder";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
