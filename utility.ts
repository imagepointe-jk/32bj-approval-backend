export function message(message: string) {
  return {
    message,
  };
}

export function printWebhookReceived(headers: any, body: any) {
  console.log("==================================");
  console.log("RECEIVED NEW WEBHOOK");
  console.log("==================================");
  console.log(`Source: ${headers["x-wc-webhook-source"]}`);
  console.log(`WC Order ID: ${body.id}`);
  console.log(`WC Customer ID: ${body["customer_id"]}`);
}
