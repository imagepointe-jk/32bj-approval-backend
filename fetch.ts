import { SERVER_ERROR } from "./constants";
import { FetchResult } from "./types";
import { INTERNAL_SERVER_ERROR, OK } from "./statusCodes";
import { parseWooCommerceOrderJson } from "./validations";

export async function fetchWooCommerceOrder(
  orderId: number
): Promise<FetchResult> {
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
