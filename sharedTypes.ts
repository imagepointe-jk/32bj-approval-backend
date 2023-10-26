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
//all the data needed for a user on a specific order
const userPerOrderSchema = z.object({
  name: z.string(),
  approvalStatus: approvalStatusSchema,
  role: roleSchema,
});
//TODO: workflow will obviously need more data than this
export const workflowOrderDataSchema = z.object({
  wcOrderId: z.number(),
  orderTotal: z.number(),
});
export const workflowUserDataSchema = z.object({
  users: z.array(userPerOrderSchema),
  activeUser: userPerOrderSchema,
});
export const workflowDataSchema = z.intersection(
  workflowOrderDataSchema,
  workflowUserDataSchema
);

export type Role = z.infer<typeof roleSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type WorkflowOrderData = z.infer<typeof workflowOrderDataSchema>;
export type WorkflowUserData = z.infer<typeof workflowUserDataSchema>;
export type WorkflowData = z.infer<typeof workflowDataSchema>;
export type UserPerOrder = z.infer<typeof userPerOrderSchema>;
