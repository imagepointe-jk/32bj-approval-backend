import {
  EmailData,
  fullyApprovedSubject,
  generateEmailsAfterApprovalStatusChange,
  generateFullyApprovedMessage,
} from "../../mail/notifications";
import { UserWithDbData } from "../../types";

const createFakeUserData = (): UserWithDbData[] => [
  {
    id: 1,
    name: "John",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "john@example.com",
    role: "artist",
  },
  {
    id: 1,
    name: "Jane",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "jane@example.com",
    role: "editor",
  },
  {
    id: 1,
    name: "Mike",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "mike@example.com",
    role: "requester",
  },
  {
    id: 1,
    name: "Mary",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "mary@example.com",
    role: "approver",
  },
  {
    id: 1,
    name: "Steve",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "steve@example.com",
    role: "releaser",
  },
];

describe("Check for correct notifications when order is fully approved", () => {
  it("should send a 'fully approved' email to everyone", async () => {
    const fakeData = createFakeUserData();
    const fakeOrderId = 1234;
    for (const user of fakeData) {
      user.approvalStatus = "approve";
    }

    const generatedEmails = generateEmailsAfterApprovalStatusChange(
      "requester",
      "approve",
      fakeOrderId,
      fakeData
    );
    expect(generatedEmails.length).toBe(fakeData.length);

    const [artist, editor, requester, approver, releaser] = fakeData;

    const expectedArtistEmail: EmailData = {
      recipientAddress: artist.email,
      subject: fullyApprovedSubject(fakeOrderId),
      message: generateFullyApprovedMessage(artist.name, fakeOrderId),
    };
    const expectedEditorEmail: EmailData = {
      recipientAddress: editor.email,
      subject: fullyApprovedSubject(fakeOrderId),
      message: generateFullyApprovedMessage(editor.name, fakeOrderId),
    };
    const expectedRequesterEmail: EmailData = {
      recipientAddress: requester.email,
      subject: fullyApprovedSubject(fakeOrderId),
      message: generateFullyApprovedMessage(requester.name, fakeOrderId),
    };
    const expectedApproverEmail: EmailData = {
      recipientAddress: approver.email,
      subject: fullyApprovedSubject(fakeOrderId),
      message: generateFullyApprovedMessage(approver.name, fakeOrderId),
    };
    const expectedReleaserEmail: EmailData = {
      recipientAddress: releaser.email,
      subject: fullyApprovedSubject(fakeOrderId),
      message: generateFullyApprovedMessage(releaser.name, fakeOrderId),
    };

    expect(generatedEmails).toContainEqual(expectedArtistEmail);
    expect(generatedEmails).toContainEqual(expectedEditorEmail);
    expect(generatedEmails).toContainEqual(expectedRequesterEmail);
    expect(generatedEmails).toContainEqual(expectedApproverEmail);
    expect(generatedEmails).toContainEqual(expectedReleaserEmail);
  });
});
