import { ApprovalStatus, OrganizationName } from "../sharedTypes";

export type TestUser = {
  name: string;
  email: string;
};
export type TestUsers = {
  artist: TestUser;
  editor: TestUser;
  requester: TestUser;
  approver: TestUser;
  releaser: TestUser;
};
export type TestOrderData = {
  wcOrderId: number;
  accessCode: string;
  organizationId: number;
};
export type TestComment = {
  text: string;
  approvalStatus: ApprovalStatus;
};
export type TestComments = {
  artistComment?: TestComment;
  editorComment?: TestComment;
  requesterComment?: TestComment;
  approverComment?: TestComment;
  releaserComment?: TestComment;
};
export type TestApprovals = {
  artistApproval?: ApprovalStatus | null;
  editorApproval?: ApprovalStatus | null;
  requesterApproval?: ApprovalStatus | null;
  approverApproval?: ApprovalStatus | null;
  releaserApproval?: ApprovalStatus | null;
};
