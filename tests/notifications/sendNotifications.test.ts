//actually send the notifications to test emails.
//designed to be tested one scenario at a time, to avoid a flood of simultaneous emails
//(which would make it harder to check them)

import "dotenv/config";
import { sendEmail } from "../../mail/mail";
import { generateEmailsAfterApprovalStatusChange } from "../../mail/notifications";
import { ApprovalStatus, Role } from "../../sharedTypes";
import { UserWithDbData } from "../../types";

const fakeOrderId = 1234;
const fakeArtist: UserWithDbData = {
  id: 1,
  name: "Ron",
  email: "dev.ron.fox@gmail.com",
  accessCode: "abc123",
  approvalStatus: "undecided",
  role: "artist",
};
const fakeEditor: UserWithDbData = {
  id: 1,
  name: "Felix",
  email: "dev.felix.richards@gmail.com",
  accessCode: "abc123",
  approvalStatus: "undecided",
  role: "editor",
};
const fakeRequester: UserWithDbData = {
  id: 1,
  name: "Josh",
  email: "josh.klope@imagepointe.com",
  accessCode: "abc123",
  approvalStatus: "undecided",
  role: "requester",
};
const fakeApprover: UserWithDbData = {
  id: 1,
  name: "Jennifer",
  email: "jennifer.hawkins@gmail.com",
  accessCode: "abc123",
  approvalStatus: "undecided",
  role: "approver",
};
const fakeReleaser: UserWithDbData = {
  id: 1,
  name: "Melvin",
  email: "dev.melvin.carpenter@gmail.com",
  accessCode: "abc123",
  approvalStatus: "undecided",
  role: "releaser",
};

const USER_TO_TEST: UserWithDbData = fakeRequester;
const APPROVAL_CHANGE_TO_TEST: ApprovalStatus = "approve";

it("will always succeed; check emails manually to verify formatting and content", () => {
  const fakeUsers = [
    fakeArtist,
    fakeEditor,
    fakeRequester,
    fakeApprover,
    fakeReleaser,
  ];
  const emailsToSend = generateEmailsAfterApprovalStatusChange(
    USER_TO_TEST.role as Role,
    APPROVAL_CHANGE_TO_TEST,
    fakeOrderId,
    fakeUsers
  );
  for (const email of emailsToSend) {
    sendEmail(email.recipientAddress, email.subject, email.message);
  }

  expect(true).toBe(true);
});
