import { SERVER_ERROR } from "./constants";
import { ServerOperationResult, WooCommerceOrderData } from "./types";
import { INTERNAL_SERVER_ERROR, OK } from "./statusCodes";
import {
  parseWooCommerceOrderJson,
  parseWordpressImageSearchResults,
} from "./validations";
import { WooCommerceLineItemModification } from "./sharedTypes";
import { createOrderImageName } from "./utility";

export async function fetchWooCommerceOrder(
  orderId: number
): Promise<ServerOperationResult & { data?: WooCommerceOrderData }> {
  const wooCommerceKey = process.env.WOO_32BJ_KEY;
  const wooCommerceSecret = process.env.WOO_32BJ_SECRET;
  const url = process.env.WOO_32BJ_API_URL;
  if (!url || !wooCommerceKey || !wooCommerceSecret) {
    console.error(
      "At least one environment variable was undefined while trying to fetch a woo commerce order"
    );
    return {
      message: SERVER_ERROR,
      statusCode: INTERNAL_SERVER_ERROR,
    };
  }

  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    `Basic ${btoa(`${wooCommerceKey}:${wooCommerceSecret}`)}`
  );

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
  };

  try {
    const wooCommerceOrderResponse = await fetch(
      `${url}/orders/${orderId}`,
      requestOptions
    );
    if (!wooCommerceOrderResponse.ok) {
      return {
        message: wooCommerceOrderResponse.statusText,
        statusCode: wooCommerceOrderResponse.status,
      };
    }

    const json = await wooCommerceOrderResponse.json();
    const parsed = parseWooCommerceOrderJson(json);
    return {
      message: "",
      statusCode: OK,
      data: parsed,
    };
  } catch (error) {
    console.error(error);
    return {
      message: SERVER_ERROR,
      statusCode: INTERNAL_SERVER_ERROR,
    };
  }
}

export async function modifyWooCommerceLineItems(
  wcOrderId: number,
  lineItems: WooCommerceLineItemModification[]
) {
  const wooCommerceKey = process.env.WOO_32BJ_KEY;
  const wooCommerceSecret = process.env.WOO_32BJ_SECRET;
  const url = process.env.WOO_32BJ_API_URL;

  const headers = new Headers();
  headers.append(
    "Authorization",
    `Basic ${btoa(`${wooCommerceKey}:${wooCommerceSecret}`)}`
  );
  headers.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    line_items: lineItems,
  });

  const requestOptions = {
    method: "PUT",
    headers: headers,
    body: raw,
  };

  return fetch(`${url}/orders/${wcOrderId}`, requestOptions);
}

export async function uploadOrderImageToWordpress(
  wcOrderId: number,
  multerFile: Express.Multer.File
) {
  const wpApiUrl = process.env.WP_32BJ_API_URL;
  const wpApiUsername = process.env.WP_32BJ_API_USERNAME;
  const wpApiPassword = process.env.WP_32BJ_API_PASSWORD;
  //assume for now that we're only serving 32BJ
  const nameToUse = createOrderImageName("32bj", wcOrderId);
  const fileExtension = multerFile.originalname.split(".")[1];
  const headers = new Headers();
  headers.append(
    "Authorization",
    `Basic ${btoa(`${wpApiUsername}:${wpApiPassword}`)}`
  );
  headers.append("Content-Type", multerFile.mimetype);
  headers.append(
    "Content-Disposition",
    `attachment; filename=${nameToUse}.${fileExtension}`
  );
  return fetch(`${wpApiUrl}/media`, {
    method: "POST",
    body: multerFile.buffer,
    headers,
  });
}

export async function getImageUrl(wcOrderId: number) {
  const wpApiUrl = process.env.WP_32BJ_API_URL;
  const wpApiUsername = process.env.WP_32BJ_API_USERNAME;
  const wpApiPassword = process.env.WP_32BJ_API_PASSWORD;
  //assume for now that we're only serving 32BJ
  const nameToUse = createOrderImageName("32bj", wcOrderId);
  const headers = new Headers();
  headers.append(
    "Authorization",
    `Basic ${btoa(`${wpApiUsername}:${wpApiPassword}`)}`
  );

  const requestOptions = {
    method: "GET",
    headers,
  };

  try {
    const response = await fetch(
      `${wpApiUrl}/media?search=${nameToUse}`,
      requestOptions
    );
    const json = await response.json();
    const parsedResults = parseWordpressImageSearchResults(json);
    if (parsedResults.length === 0) return "";
    return parsedResults[0].guid.rendered;
  } catch (error) {
    console.error(
      `Failed to retrieve image '${nameToUse}' for WooCommerce order ${wcOrderId}:`,
      error
    );
    return "";
  }
}
