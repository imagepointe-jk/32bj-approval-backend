import { eraseDb } from "../../seed/eraseDb";
import { OK } from "../../statusCodes";
import { fakeWebhook } from "../fakeData";

async function getFakeWebhookResponse() {
  var myHeaders = new Headers();
  myHeaders.append(
    "User-Agent",
    "WooCommerce/8.2.1 Hookshot (WordPress/6.3.1)"
  );
  myHeaders.append("Accept-Encoding", "deflate, gzip, br, zstd");
  myHeaders.append("x-wc-webhook-source", "https://imagepointewebstores.com/");
  myHeaders.append("x-wc-webhook-topic", "order.created");
  myHeaders.append("x-wc-webhook-resource", "order");
  myHeaders.append("x-wc-webhook-event", "created");
  myHeaders.append(
    "x-wc-webhook-signature",
    "v4lkwecT1H6zZZ1I/G4HvBp7lm9TnR/eg3P5axa0xHg="
  );
  myHeaders.append("x-wc-webhook-id", "4");
  myHeaders.append(
    "x-wc-webhook-delivery-id",
    "a0f5c582785f3aa040fe4cacc1a0dff4"
  );
  myHeaders.append("x-forwarded-for", "162.222.176.143");
  myHeaders.append("x-forwarded-proto", "https");
  myHeaders.append("x-envoy-external-address", "162.222.176.143");
  myHeaders.append("x-request-id", "1bbd2a37-efa7-4bbd-bbca-3b73fa4d41e3");
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("webhookDevPass", process.env.WEBHOOK_DEV_PASS!);
  const body = JSON.stringify(fakeWebhook);
  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body,
  };

  return fetch("http://localhost:3000", requestOptions);
}

it("should create access codes that provide the fake users access", async () => {
  await eraseDb();

  //Simulate an incoming webhook from WooCommerce, and get back the response
  const webhookResponse = await getFakeWebhookResponse();
  const json = await webhookResponse.json();
  //Since we included the dev password in the fake webhook, we should get back the access codes created
  const {
    artistAccessCode,
    editorAccessCode,
    requesterAccessCode,
    approverAccessCode,
    releaserAccessCode,
  } = json;
  expect(artistAccessCode).toBeDefined();
  expect(editorAccessCode).toBeDefined();
  expect(requesterAccessCode).toBeDefined();
  expect(approverAccessCode).toBeDefined();
  expect(releaserAccessCode).toBeDefined();

  //check if the access codes received actually work
  const artistAccessCodeResponse = await fetch(
    `http://localhost:3000/workflow/${artistAccessCode}`
  );
  expect(artistAccessCodeResponse.status).toBe(OK);

  const requesterAccessCodeResponse = await fetch(
    `http://localhost:3000/workflow/${requesterAccessCode}`
  );
  expect(requesterAccessCodeResponse.status).toBe(OK);

  expect(true).toBe(true);
});
