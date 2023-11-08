import { z } from "zod";
import {
  WooCommerceLineItem,
  approvalStatusSchema,
  roleSchema,
  wooCommerceLineItemSchema,
} from "./sharedTypes";
import { wooCommerceOrderDataSchema } from "./sharedTypes";
import { numberInString, webhookRequestSchema } from "./types";

function tryFindWooCommerceLineItemCustomOption(
  customOptions: any[],
  optionName: string,
  required = true
) {
  const customOption = customOptions.find(
    (option) => option.name.toLocaleLowerCase() === optionName
  );
  if (!customOption && required) {
    console.error(`No option found with the name ${optionName}`);
    throw new Error();
  }
  return customOption;
}

function parseWooCommerceLineItem(
  lineItem: any
): WooCommerceLineItem | undefined {
  //the data that comes from WC is very messy and deeply nested.
  //no point in making a complicated zod schema to parse the raw version.
  //clean it up before using zod to parse.

  if (`${lineItem.name}`.toLocaleLowerCase().includes("product designer")) {
    //product designer items are not a real product that the customer ordered.
    //they're just a hacky way to carry information about the customer's art design choice.
    return undefined;
  }

  const sizeMeta = lineItem.meta_data.find(
    (meta: any) => meta.key.toLocaleLowerCase() === "size"
  );

  const optionsMeta = lineItem.meta_data.find(
    (meta: any) => meta.key.toLocaleLowerCase() === "_wpo_options"
  );
  if (!sizeMeta || !optionsMeta) {
    console.error("no size meta and/or options meta");
    throw new Error();
  }

  const customOptions = fakeToRealArray(optionsMeta.value);
  const printLocationsOption = tryFindWooCommerceLineItemCustomOption(
    customOptions,
    "print locations"
  );
  const designCountOption = tryFindWooCommerceLineItemCustomOption(
    customOptions,
    "number of designs"
  );
  const design1ColorsOption = tryFindWooCommerceLineItemCustomOption(
    customOptions,
    "design 1 colors"
  );
  //if user didn't request 2 designs, there won't be design #2 colors
  const design2ColorsOption = tryFindWooCommerceLineItemCustomOption(
    customOptions,
    "design 2 colors",
    false
  );

  const quantity = lineItem.quantity;
  const total = lineItem.total;
  const totalTax = lineItem.total_tax;
  const size = `${sizeMeta.value}`;
  const printLocations = (printLocationsOption["choice_data"] as any[]).map(
    (choice: any) => `${choice.label}`
  );
  const designCount = +designCountOption["choice_data"][0].label;
  const design1Colors = `${design1ColorsOption["choice_data"][0].label}`;
  const design2Colors = design2ColorsOption
    ? `${design2ColorsOption["choice_data"][0].label}`
    : undefined;

  return wooCommerceLineItemSchema.parse({
    name: lineItem.name,
    quantity,
    size,
    total,
    totalTax,
    printLocations,
    designCount,
    design1Colors,
    design2Colors,
  });
}

export function parseWooCommerceOrderJson(json: any) {
  const lineItemsUnparsed: any[] = json["line_items"];
  if (!lineItemsUnparsed) {
    console.error("No line items array in WC order");
    throw new Error();
  }
  const lineItemsParsed = lineItemsUnparsed.map((item) =>
    parseWooCommerceLineItem(item)
  );
  const lineItemsFiltered = lineItemsParsed.filter(
    (item): item is WooCommerceLineItem => typeof item !== "undefined"
  );

  json.lineItems = lineItemsFiltered;
  json.totalTax = json.total_tax;

  return wooCommerceOrderDataSchema.parse(json);
}

export function parseApprovalStatus(str: string) {
  return approvalStatusSchema.parse(str);
}

export function parseRole(str: string) {
  return roleSchema.parse(str);
}

export function parseWebhookRequest(req: any) {
  const approverEmail = req.body["meta_data"].find(
    (item: any) => item.key === "_additional_approver_emailfmeadditional"
  ).value;
  req.body.approverEmail = approverEmail;
  req.headers.webhookSource = req.headers["x-wc-webhook-source"];
  req.headers.webhookDevPass = req.headers.webhookdevpass;
  return webhookRequestSchema.parse(req);
}

//some of the woo commerce json data contains objects with variable amounts of numeric keys.
//this is basically a bad stand-in for an array. use this to convert to a real array.
function fakeToRealArray(obj: any) {
  const arr: any[] = [];
  for (const [key, value] of Object.entries(obj)) {
    arr.push(value);
  }
  return arr;
}
