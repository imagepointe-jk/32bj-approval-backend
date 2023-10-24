import { prisma } from "./client";
import {
  testComment1,
  testComment2,
  testComment3,
  testComment4,
  testWcOrderId1,
  testWcOrderId2,
} from "./seedData";
import { ApprovalStatus, Role } from "./types";

async function eraseDb() {
  console.log("Erasing");
  await prisma.comment.deleteMany();
  await prisma.userApproval.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.order.deleteMany();
}

async function createUser(name: string, email: string) {
  return await prisma.user.create({
    data: {
      name,
      email,
    },
  });
}

async function createOrder(
  wcOrderId: number,
  accessCode: string,
  userIds: number[]
) {
  return await prisma.order.create({
    data: {
      accessCode,
      wcOrderId,
      users: {
        connect: userIds.map((id) => ({ id })),
      },
    },
  });
}

async function createComment(
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

async function createApproval(
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

async function createRole(userId: number, orderId: number, role: Role) {
  return await prisma.userRole.create({
    data: {
      userId,
      orderId,
      role,
    },
  });
}

async function createTestWorkflow(
  users: TestUsers,
  orderData: TestOrderData,
  testComments: TestComments,
  testApprovals: TestApprovals
) {
  const artist = await createUser(users.artist.name, users.artist.email);
  const editor = await createUser(users.editor.name, users.editor.email);
  const requester = await createUser(
    users.requester.name,
    users.requester.email
  );
  const approver = await createUser(users.approver.name, users.approver.email);
  const releaser = await createUser(users.releaser.name, users.releaser.email);

  const order = await createOrder(orderData.wcOrderId, orderData.accessCode, [
    artist.id,
    editor.id,
    requester.id,
    approver.id,
    releaser.id,
  ]);

  await createRole(artist.id, order.id, "artist");
  await createRole(editor.id, order.id, "editor");
  await createRole(requester.id, order.id, "requester");
  await createRole(approver.id, order.id, "approver");
  await createRole(releaser.id, order.id, "releaser");

  const {
    artistComment,
    editorComment,
    requesterComment,
    approverComment,
    releaserComment,
  } = testComments;

  const commentsWithIds = [
    {
      id: artist.id,
      comment: artistComment,
    },
    {
      id: editor.id,
      comment: editorComment,
    },
    {
      id: requester.id,
      comment: requesterComment,
    },
    {
      id: approver.id,
      comment: approverComment,
    },
    {
      id: releaser.id,
      comment: releaserComment,
    },
  ];

  for (const c of commentsWithIds) {
    if (c.comment) {
      await createComment(
        c.comment.text,
        c.id,
        order.id,
        c.comment.approvalStatus,
        new Date()
      );
    }
  }

  const approvalsWithIds = [
    {
      id: artist.id,
      approval: testApprovals.artistApproval,
    },
    {
      id: editor.id,
      approval: testApprovals.editorApproval,
    },
    {
      id: requester.id,
      approval: testApprovals.requesterApproval,
    },
    {
      id: approver.id,
      approval: testApprovals.approverApproval,
    },
    {
      id: releaser.id,
      approval: testApprovals.releaserApproval,
    },
  ];

  for (const a of approvalsWithIds) {
    if (a.approval) {
      await createApproval(a.id, order.id, a.approval);
    }
  }

  return {
    artist,
    editor,
    requester,
    approver,
    releaser,
    order,
  };
}

async function seedDb() {
  console.log("Seeding");

  const workflow1 = await createTestWorkflow(
    {
      artist: {
        name: "John",
        email: "john@example.com",
      },
      editor: {
        name: "Jane",
        email: "jane@site.com",
      },
      requester: {
        name: "Steve",
        email: "steve@example.com",
      },
      approver: {
        name: "Nancy",
        email: "nancy@site.com",
      },
      releaser: {
        name: "Bob",
        email: "bob@example.com",
      },
    },
    {
      wcOrderId: testWcOrderId1,
      accessCode: "sdhfkay213987hk",
    },
    {
      requesterComment: {
        text: testComment1,
        approvalStatus: "revise",
      },
      approverComment: {
        text: testComment2,
        approvalStatus: "cancel",
      },
    },
    {
      requesterApproval: "revise",
      approverApproval: "cancel",
    }
  );

  const workflow2 = await createTestWorkflow(
    {
      artist: {
        name: "Bill",
        email: "Bill@example.com",
      },
      editor: {
        name: "Sue",
        email: "Sue@site.com",
      },
      requester: {
        name: "Rick",
        email: "rick@example.com",
      },
      approver: {
        name: "Meg",
        email: "meg@site.com",
      },
      releaser: {
        name: "Rob",
        email: "rob@example.com",
      },
    },
    {
      wcOrderId: testWcOrderId2,
      accessCode: "hsjf798324jsfd",
    },
    {
      requesterComment: {
        text: testComment3,
        approvalStatus: "revise",
      },
      releaserComment: {
        text: testComment4,
        approvalStatus: "revise",
      },
    },
    {
      requesterApproval: "revise",
      releaserApproval: "revise",
    }
  );
}

eraseDb()
  .then(() => seedDb())
  .then(() => console.log("Done seeding"))
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

type TestUser = {
  name: string;
  email: string;
};
type TestUsers = {
  artist: TestUser;
  editor: TestUser;
  requester: TestUser;
  approver: TestUser;
  releaser: TestUser;
};
type TestOrderData = {
  wcOrderId: number;
  accessCode: string;
};
type TestComment = {
  text: string;
  approvalStatus: ApprovalStatus;
};
type TestComments = {
  artistComment?: TestComment;
  editorComment?: TestComment;
  requesterComment?: TestComment;
  approverComment?: TestComment;
  releaserComment?: TestComment;
};
type TestApprovals = {
  artistApproval?: ApprovalStatus | null;
  editorApproval?: ApprovalStatus | null;
  requesterApproval?: ApprovalStatus | null;
  approverApproval?: ApprovalStatus | null;
  releaserApproval?: ApprovalStatus | null;
};
