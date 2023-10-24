/*
  Warnings:

  - You are about to drop the `UserOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserOrder";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "_OrderToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_OrderToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OrderToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_OrderToUser_AB_unique" ON "_OrderToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_OrderToUser_B_index" ON "_OrderToUser"("B");
