import { prisma } from "../client";

export async function eraseDb() {
    console.log("Erasing");
    await prisma.comment.deleteMany();
    await prisma.userApproval.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.accessCode.deleteMany();
    await prisma.user.deleteMany();
    await prisma.order.deleteMany();
  }