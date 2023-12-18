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
export const organizationNames = ["32BJ", "RandomTest"] as const;
//#endregion

export const dateInString = z.string().transform((val, ctx) => {
  const parsed = new Date(val);
  if (isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Not a date",
    });

    return z.NEVER;
  }
  return parsed;
});

//#region woo commerce schema
export const wooCommerceLineItemSchema = z.object({
  id: z.number(),
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

export const wooCommerceFeeLineSchema = z.object({
  id: z.number(),
  name: z.string(),
  total: z.string(),
});

//WC returns a lot of order data. only include what's necessary in the schema.
export const wooCommerceOrderDataSchema = z.object({
  id: z.number(),
  total: z.string(),
  totalTax: z.string(),
  shippingTotal: z.string(),
  lineItems: z.array(wooCommerceLineItemSchema),
  feeLines: z.array(wooCommerceFeeLineSchema),
});
export const wooCommerceLineItemModificationSchema = z.object({
  id: z.number(),
  subtotal: z.string().optional(),
  total: z.string().optional(),
  quantity: z.number().optional(),
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
export const workflowUserDataSchema = z.object({
  users: z.array(userPerOrderSchema),
  activeUser: userPerOrderSchema,
});
export const organizationNameSchema = z.enum(organizationNames);
export const workflowCommentSchema = z.object({
  userName: z.string(),
  userRole: roleSchema,
  text: z.string(),
  dateCreated: dateInString,
  approvalStatus: approvalStatusSchema,
});
export const dataForAccessCodeSchema = z.object({
  userData: workflowUserDataSchema,
  wcOrderId: z.number(),
  organizationName: organizationNameSchema,
  imageUrl: z.string(),
  comments: z.array(workflowCommentSchema),
});
export const workflowDataSchema = z.intersection(
  wooCommerceOrderDataSchema.omit({ id: true }),
  dataForAccessCodeSchema
);
//#endregion

export type Role = z.infer<typeof roleSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type WorkflowUserData = z.infer<typeof workflowUserDataSchema>;
export type WorkflowData = z.infer<typeof workflowDataSchema>;
export type WorkflowComment = z.infer<typeof workflowCommentSchema>;
export type UserPerOrder = z.infer<typeof userPerOrderSchema>;
export type DataForAccessCode = z.infer<typeof dataForAccessCodeSchema>;
export type OrganizationName = z.infer<typeof organizationNameSchema>;

export type WooCommerceLineItem = z.infer<typeof wooCommerceLineItemSchema>;
export type WooCommerceLineItemModification = z.infer<
  typeof wooCommerceLineItemModificationSchema
>;
