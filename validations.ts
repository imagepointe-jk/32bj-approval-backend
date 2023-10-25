import { wooCommerceOrderResponseSchema } from "./types";

export function parseWooCommerceOrderJson(json: any) {
  return wooCommerceOrderResponseSchema.parse(json);
}
