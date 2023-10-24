import { z } from "zod";

export const roles = [
  "artist",
  "editor",
  "requester",
  "approver",
  "releaser",
] as const;
export const approvalStatuses = [
  "undecided",
  "approve",
  "cancel",
  "revise",
] as const;

export const roleSchema = z.enum(roles);
export const approvalStatusSchema = z.enum(approvalStatuses);

export type Role = z.infer<typeof roleSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
