import express, { json } from "express";
import { getDataForAccessCode } from "./dbLogic";
import { fetchWooCommerceOrder } from "./fetch";
import { WorkflowData } from "./sharedTypes";
import { OK } from "./statusCodes";
import { message } from "./utility";
import * as crypto from "crypto";

const app = express();
// app.use(json());

//TODO: validate all inputs (like zod middleware would do)

//get data associated with access code
app.get("/workflow/:accessCode", express.json(), async (req, res) => {
  const accessCode = req.params.accessCode;
  //use the access code to figure out what user and order we're viewing
  //this comes from our db
  const {
    message: userDataErrorMessage,
    statusCode,
    data,
  } = await getDataForAccessCode(accessCode);
  if (statusCode !== OK || data === undefined) {
    return res.status(statusCode).send(message(userDataErrorMessage));
  }

  //use the WC order id found with the access code to get more order data
  const { userData, wcOrderId, organizationName } = data;
  const fetchOrderResult = await fetchWooCommerceOrder(wcOrderId);
  const fetchedOrderData = fetchOrderResult.data;
  if (fetchOrderResult.statusCode !== OK || !fetchedOrderData) {
    return res
      .status(fetchOrderResult.statusCode)
      .send(message(fetchOrderResult.message));
  }

  const workflowData: WorkflowData = {
    organizationName,
    wcOrderId: fetchedOrderData.id,
    lineItems: fetchedOrderData.lineItems,
    total: fetchedOrderData.total,
    totalTax: fetchedOrderData.totalTax,
    userData,
  };

  res.status(OK).send(workflowData);
});

//receive webhook from WooCommerce
app.post(
  "/",
  (req, res, next) => {
    (req as any).rawBody = "";

    req.on("data", (chunk) => {
      (req as any).rawBody += chunk;
    });

    req.on("end", () => {
      next();
    });
  },
  (req, res) => {
    console.log("Received request==============");
    console.log((req as any).rawBody);
    console.log("Headers: ");
    console.log(req.headers);
    const payload = JSON.stringify((req as any).rawBody);
    console.log("payload: " + payload);
    const secret = process.env.WOO_WEBHOOK_SECRET!;
    try {
      const hash = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64");
      console.log("Hash: " + hash);
      console.log(
        "Received signature: " + req.headers["x-wc-webhook-signature"]
      );
    } catch (error) {
      res.status(200).send();
    }
    // console.log("headers:");
    // console.log(req.headers);
    // const secret = process.env.WOO_WEBHOOK_SECRET!;
    // console.log("Secret: " + secret);
    // const payload = JSON.stringify(req.rawBody);
    // console.log("Payload: " + payload);
    // const hash = crypto
    //   .createHmac("sha256", secret)
    //   .update(payload)
    //   .digest("base64");
    // console.log("Hash: " + hash);
    // console.log("Received signature: " + req.headers["x-wc-webhook-signature"]);
    res.status(200).send();
  }
);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
