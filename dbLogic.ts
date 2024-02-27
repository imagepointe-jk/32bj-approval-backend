import { v4 as uuidv4 } from "uuid";
import { prisma } from "./client";
import { AppError } from "./error";
import { getImageUrl } from "./fetch";
import {
  ApprovalStatus,
  DataForAccessCode,
  Role,
  UserPerOrder,
  WorkflowComment,
} from "./sharedTypes";
import { FORBIDDEN, INTERNAL_SERVER_ERROR } from "./statusCodes";
import {
  isStringApprovalStatus,
  parseApprovalStatus,
  parseRole,
} from "./validations";

//get relevant data from OUR db (not WooCommerce) related to an access code
export async function getDataForAccessCode(
  accessCode: string
): Promise<DataForAccessCode> {
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

  if (!accessCodeInDb)
    throw new AppError("Authentication", FORBIDDEN, "Invalid access code.");

  const { user: activeUser, order: activeOrder } = accessCodeInDb;
  const workflowComments: WorkflowComment[] = await getWorkflowComments(
    activeOrder.id
  );
  const orderImageUrl = await getImageUrl(activeOrder.wcOrderId);
  const { activeUserData, userData } = await getPerUserData(
    activeOrder.id,
    activeUser.id
  );

  return {
    userData: { users: userData, activeUser: activeUserData },
    wcOrderId: activeOrder.wcOrderId,
    organizationName: activeOrder.organization.name,
    imageUrl: orderImageUrl,
    comments: workflowComments,
  };
}

async function getWorkflowComments(
  orderId: number
): Promise<WorkflowComment[]> {
  const commentsThisOrder = await prisma.comment.findMany({
    where: {
      orderId: orderId,
    },
    include: {
      user: {
        include: {
          roles: true,
        },
      },
    },
  });

  return commentsThisOrder.map((comment) => {
    const userRole = comment.user.roles.find(
      (role) => role.orderId === orderId
    )!;
    const parsedRole = parseRole(userRole.role);
    const parsedApproval = isStringApprovalStatus(`${comment.approvalStatus}`)
      ? (comment.approvalStatus as ApprovalStatus)
      : undefined;
    const userName = comment.user.name;
    const builtComment: WorkflowComment = {
      dateCreated: comment.dateCreated,
      text: comment.text,
      userName,
      userRole: parsedRole,
      approvalStatus: parsedApproval,
    };
    return builtComment;
  });
}

async function getPerUserData(orderId: number, activeUserId: number) {
  //Look through the users, roles, etc. for this order. Build user data objects that will be easy for the front end to use.
  //While looping, also pull out the role and approval status for the user associated with the access code.
  let activeUserData: UserPerOrder | undefined = undefined;
  const userRolesThisOrder = await prisma.userRole.findMany({
    where: {
      orderId: orderId,
    },
    include: {
      user: {
        include: {
          approvalStatuses: true,
        },
      },
    },
  });

  const userData = userRolesThisOrder.map((roleEntry) => {
    const role = parseRole(roleEntry.role);
    const statusEntryThisOrder = roleEntry.user.approvalStatuses.find(
      (status) => status.orderId === orderId
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
    if (roleEntry.user.id === activeUserId) activeUserData = userData;

    return userData;
  });

  if (activeUserData === undefined) {
    console.error(
      `User ${activeUserId} had an access code for order ${orderId} but no role in the order!`
    );
    throw new AppError(
      "Data Integrity",
      INTERNAL_SERVER_ERROR,
      "Server error."
    );
  }

  return {
    userData,
    activeUserData,
  };
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

export async function createOrganization(name: string) {
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
