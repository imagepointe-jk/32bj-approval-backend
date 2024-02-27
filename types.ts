import { z } from "zod";
import {
  approvalStatusSchema,
  wooCommerceOrderDataSchema,
} from "./sharedTypes";

export const numberInString = z.string().transform((val, ctx) => {
  const parsed = +val;
  if (isNaN(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Not a number",
    });

    return z.NEVER;
  }
  return parsed;
});

export const webhookRequestSchema = z.object({
  headers: z.object({
    webhookSource: z.string(),
    webhookDevPass: z.string().optional(),
  }),
  body: z.object({
    id: z.number(),
    billing: z.object({
      first_name: z.string(),
      email: z.string(),
    }),
    approverEmail: z.string(),
  }),
});

export const approvalPostBodySchema = z.object({
  approvalStatus: approvalStatusSchema,
  accessCode: z.string(),
});

export type WooCommerceOrderData = z.infer<typeof wooCommerceOrderDataSchema>;

export type UserWithDbData = {
  id: number;
  name: string;
  email: string;
  role: string;
  approvalStatus: string;
  accessCode: string;
};
