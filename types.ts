import { z } from "zod";

export type FetchResult = {
  statusCode: number;
  message: string;
  data?: any;
};

const numberInString = z.string().transform((val, ctx) => {
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

export const intParseableString = z
  .string()
  .refine((str) => !isNaN(parseInt(str)));

//WC returns a lot of order data. only include what's necessary in the schema.
export const wooCommerceOrderResponseSchema = z.object({
  id: z.number(),
  total: numberInString,
});
