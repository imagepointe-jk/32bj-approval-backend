import { z } from "zod";

//#region enum values
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
//#endregion

//#region woo commerce schema
export const wooCommerceLineItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  size: z.string(),
  total: z.string(),
  totalTax: z.string(),
  printLocations: z.array(z.string()),
  designCount: z.number(),
  design1Colors: z.string(),
  design2Colors: z.string().optional(),
});

//WC returns a lot of order data. only include what's necessary in the schema.
export const wooCommerceOrderDataSchema = z.object({
  id: z.number(),
  total: z.string(),
  totalTax: z.string(),
  lineItems: z.array(wooCommerceLineItemSchema),
});
//#endregion

//#region app-specific schema
export const roleSchema = z.enum(roles);
export const approvalStatusSchema = z.enum(approvalStatuses);
//all the data needed for a user on a specific order
const userPerOrderSchema = z.object({
  name: z.string(),
  approvalStatus: approvalStatusSchema,
  role: roleSchema,
});
//TODO: workflow will obviously need more data than this
export const workflowUserDataSchema = z.object({
  users: z.array(userPerOrderSchema),
  activeUser: userPerOrderSchema,
});
export const workflowDataSchema = z.intersection(
  wooCommerceOrderDataSchema,
  workflowUserDataSchema
);
//#endregion

export type Role = z.infer<typeof roleSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type WorkflowUserData = z.infer<typeof workflowUserDataSchema>;
export type WorkflowData = z.infer<typeof workflowDataSchema>;
export type UserPerOrder = z.infer<typeof userPerOrderSchema>;

export type WooCommerceLineItem = z.infer<typeof wooCommerceLineItemSchema>;
