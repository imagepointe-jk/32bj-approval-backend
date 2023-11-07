import { prisma } from "./client";
import { SERVER_ERROR } from "./constants";
import {
  ApprovalStatus,
  DataForAccessCode,
  OrganizationName,
  Role,
  UserPerOrder,
  WorkflowUserData,
  organizationNameSchema,
} from "./sharedTypes";
import { FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from "./statusCodes";
import { ServerOperationResult } from "./types";
import { parseApprovalStatus, parseRole } from "./validations";
import { v4 as uuidv4 } from "uuid";

//get relevant data from OUR db (not WooCommerce) related to an access code
export async function getDataForAccessCode(accessCode: string): Promise<
  ServerOperationResult & {
    data?: DataForAccessCode;
  }
> {
  //Check if valid access code
  const accessCodeInDb = await prisma.accessCode.findUnique({
    where: {
      code: accessCode,
    },
    include: {
      user: true,
      order: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!accessCodeInDb) {
    return {
      message: "Invalid access code.",
      statusCode: FORBIDDEN,
    };
  }

  const { user: activeUser, order: activeOrder } = accessCodeInDb;

  const userRolesThisOrder = await prisma.userRole.findMany({
    where: {
      orderId: activeOrder.id,
    },
    include: {
      user: {
        include: {
          approvalStatuses: true,
        },
      },
    },
  });

  try {
    const organizationName = organizationNameSchema.parse(
      activeOrder.organization.name
    );

    //Look through the users, roles, etc. for this order. Build user data objects that will be easy for the front end to use.
    //While looping, also pull out the role and approval status for the user associated with the access code.
    //If any bad strings are found for role or approval, it's caught here.
    let activeUserData: UserPerOrder | undefined = undefined;
    const relevantDataPerUser = userRolesThisOrder.map((roleEntry) => {
      const role = parseRole(roleEntry.role);
      const statusEntryThisOrder = roleEntry.user.approvalStatuses.find(
        (status) => status.orderId === activeOrder.id
      );
      const hasStatusThisOrder = statusEntryThisOrder !== undefined;
      const approvalStatus: ApprovalStatus = hasStatusThisOrder
        ? parseApprovalStatus(statusEntryThisOrder.approvalStatus)
        : "undecided";
      const userData: UserPerOrder = {
        name: roleEntry.user.name,
        approvalStatus,
        role,
      };
      if (roleEntry.user.id === activeUser.id) activeUserData = userData;

      return userData;
    });
    if (activeUserData === undefined) {
      console.error(
        `User ${activeUser.id} had an access code for order ${activeOrder.id} but no role in the order!`
      );
      return {
        message: SERVER_ERROR,
        statusCode: INTERNAL_SERVER_ERROR,
      };
    }

    return {
      message: "",
      statusCode: OK,
      data: {
        userData: { users: relevantDataPerUser, activeUser: activeUserData },
        wcOrderId: activeOrder.wcOrderId,
        organizationName: organizationName,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      message: SERVER_ERROR,
      statusCode: INTERNAL_SERVER_ERROR,
    };
  }
}

export async function createUser(name: string, email: string) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (existingUser) return existingUser;

  return await prisma.user.create({
    data: {
      name,
      email,
    },
  });
}

export async function createOrder(wcOrderId: number, organizationId: number) {
  return await prisma.order.create({
    data: {
      wcOrderId,
      organizationId,
    },
  });
}

export async function createComment(
  text: string,
  userId: number,
  orderId: number,
  approvalStatus: ApprovalStatus,
  dateCreated: Date
) {
  return await prisma.comment.create({
    data: {
      userId,
      orderId,
      approvalStatus,
      dateCreated,
      text,
    },
  });
}

export async function createApproval(
  userId: number,
  orderId: number,
  approvalStatus: ApprovalStatus
) {
  return await prisma.userApproval.create({
    data: {
      userId,
      orderId,
      approvalStatus,
    },
  });
}

export async function createRole(userId: number, orderId: number, role: Role) {
  return await prisma.userRole.create({
    data: {
      userId,
      orderId,
      role,
    },
  });
}

export async function createAccessCode(userId: number, orderId: number) {
  return await prisma.accessCode.create({
    data: {
      userId,
      orderId,
      code: uuidv4(),
    },
  });
}

export async function createOrganization(name: OrganizationName) {
  const existingOrganization = await prisma.organization.findUnique({
    where: {
      name,
    },
  });
  if (existingOrganization) return existingOrganization;

  return await prisma.organization.create({
    data: {
      name,
    },
  });
}
