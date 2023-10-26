import { approvalStatusSchema, roleSchema } from "./sharedTypes";
import { wooCommerceOrderDataSchema } from "./types";

export function parseWooCommerceOrderJson(json: any) {
  return wooCommerceOrderDataSchema.parse(json);
}

export function parseApprovalStatus(str: string) {
  return approvalStatusSchema.parse(str);
}

export function parseRole(str: string) {
  return roleSchema.parse(str);
}
