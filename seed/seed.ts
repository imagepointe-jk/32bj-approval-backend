import { prisma } from "../client";
import { ApprovalStatus, Role } from "../sharedTypes";
import {
  testComment1,
  testComment2,
  testComment3,
  testComment4,
  testUser1,
  testUser2,
  testUser3,
  testUser4,
  testUser5,
  testUser8,
  testWcOrderId1,
  testWcOrderId2,
} from "./seedData";
import {
  TestApprovals,
  TestComments,
  TestOrderData,
  TestUsers,
} from "./seedTypes";
import { eraseDb } from "./eraseDb";
import {
  createAccessCode,
  createApproval,
  createComment,
  createOrder,
  createOrganization,
  createRole,
  createUser,
} from "../dbLogic";

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

  const order = await createOrder(
    orderData.wcOrderId,
    orderData.organizationId
  );

  await createRole(artist.id, order.id, "artist");
  await createRole(editor.id, order.id, "editor");
  await createRole(requester.id, order.id, "requester");
  await createRole(approver.id, order.id, "approver");
  await createRole(releaser.id, order.id, "releaser");

  await createAccessCode(artist.id, order.id);
  await createAccessCode(editor.id, order.id);
  await createAccessCode(requester.id, order.id);
  await createAccessCode(approver.id, order.id);
  await createAccessCode(releaser.id, order.id);

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

  const organization1 = await createOrganization("32BJ");
  const organization2 = await createOrganization("RandomTest");

  const workflow1 = await createTestWorkflow(
    {
      artist: testUser1,
      editor: testUser2,
      requester: testUser3,
      approver: testUser4,
      releaser: testUser5,
    },
    {
      wcOrderId: testWcOrderId1,
      accessCode: "sdhfkay213987hk",
      organizationId: organization1.id,
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
      artist: testUser1,
      editor: testUser2,
      requester: testUser4,
      approver: testUser3,
      releaser: testUser8,
    },
    {
      wcOrderId: testWcOrderId2,
      accessCode: "hsjf798324jsfd",
      organizationId: organization2.id,
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
