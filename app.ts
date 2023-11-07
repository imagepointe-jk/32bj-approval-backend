import express, { json } from "express";
import {
  createAccessCode,
  createOrder,
  createOrganization,
  createRole,
  createUser,
  getDataForAccessCode,
} from "./dbLogic";
import { fetchWooCommerceOrder } from "./fetch";
import { WorkflowData } from "./sharedTypes";
import { OK } from "./statusCodes";
import { message, printWebhookReceived } from "./utility";
import { sendEmail } from "./mail/mail";
import { parseWebhookRequest } from "./validations";
import {
  imagePointeArtist,
  imagePointeEditor,
  organizationReleaser,
  organizationSources,
  testApprover,
} from "./constants";

const app = express();
app.use(json());

//TODO: validate all inputs (like zod middleware would do)

//get data associated with access code
app.get("/workflow/:accessCode", async (req, res) => {
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
//! This is technically a security vulnerability.
//! Tried to find a way to verify genuine WC webhooks, but there is almost no documentation on how to do this, and all my attempts have failed so far.
//! Likely not a major risk for this project, but something to come back to if there's time.
app.post("/", async (req, res) => {
  printWebhookReceived(req.headers, req.body);
  try {
    const parsedRequest = parseWebhookRequest(req);
    const {
      billing: { email, first_name },
      approverEmail,
      id: wcOrderId,
    } = parsedRequest.body;
    const { webhookSource } = parsedRequest.headers;
    //create organization
    const organizationSource = organizationSources.find(
      (source) => source.webhookSource === webhookSource
    );
    if (!organizationSource) {
      throw new Error(`The webhook source ${webhookSource} is not recognized`);
    }
    const organization = await createOrganization(
      organizationSource.organizationName
    );
    //create users: artist, editor, requester, approver, releaser
    const artist = await createUser(
      imagePointeArtist.name,
      imagePointeArtist.email
    );
    const editor = await createUser(
      imagePointeEditor.name,
      imagePointeEditor.email
    );
    const requester = await createUser(first_name, email);
    const approver = await createUser(testApprover.name, testApprover.email);
    const releaser = await createUser(
      organizationReleaser.name,
      organizationReleaser.email
    );
    //create order
    const order = await createOrder(wcOrderId, organization.id);
    //create roles connecting each user to this order
    await createRole(artist.id, order.id, "artist");
    await createRole(editor.id, order.id, "editor");
    await createRole(requester.id, order.id, "requester");
    await createRole(approver.id, order.id, "approver");
    await createRole(releaser.id, order.id, "releaser");
    //create access codes for each user, for this order
    const artistAccessCode = await createAccessCode(artist.id, order.id);
    const editorAccessCode = await createAccessCode(editor.id, order.id);
    const requesterAccessCode = await createAccessCode(requester.id, order.id);
    const approverAccessCode = await createAccessCode(approver.id, order.id);
    const releaserAccessCode = await createAccessCode(releaser.id, order.id);

    sendEmail(
      artist.email,
      "Order Approval",
      `A new order for ${organization.name} is ready for an art proof. Please create one and use the access code ${artistAccessCode.code} to upload it.`
    );
    sendEmail(
      editor.email,
      "Order Approval",
      `A new order for ${organization.name} is ready for review. Please use the access code ${editorAccessCode.code} to check the data.`
    );
  } catch (error) {
    console.error(`Error creating order: ${error}`);
    res.status(200).send(); //always send a 200 back to WC, to avoid breaking their brittle webhook
  }

  res.status(200).send();
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
