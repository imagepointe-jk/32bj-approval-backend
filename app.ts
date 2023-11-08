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
import { WorkflowData, approvalStatuses } from "./sharedTypes";
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "./statusCodes";
import { message, printWebhookReceived } from "./utility";
import { sendEmail } from "./mail/mail";
import { parseApprovalStatus, parseWebhookRequest } from "./validations";
import {
  imagePointeArtist,
  imagePointeEditor,
  organizationReleaser,
  organizationSources,
  testApprover,
} from "./constants";
import { prisma } from "./client";

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
    //if the developer password is provided, we can return access codes for testing purposes
    const isDeveloperRequest =
      parsedRequest.headers.webhookDevPass === process.env.WEBHOOK_DEV_PASS;

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

    const data = isDeveloperRequest
      ? {
          artistAccessCode: artistAccessCode.code,
          editorAccessCode: editorAccessCode.code,
          requesterAccessCode: requesterAccessCode.code,
          approverAccessCode: approverAccessCode.code,
          releaserAccessCode: releaserAccessCode.code,
        }
      : {};

    res.status(200).send(data);
  } catch (error) {
    console.error(`Error creating order: ${error}`);
    res.status(200).send(); //always send a 200 back to WC, to avoid breaking their brittle webhook
  }
});

app.post("/approval", async (req, res) => {
  const errors = {
    approvalError: "Invalid approval status.",
    accessCodeError: "Invalid access code.",
  };

  try {
    const approvalStatus = req.body.approvalStatus;
    const accessCode = req.body.accessCode;
    if (!approvalStatuses.includes(approvalStatus))
      throw new Error(errors.approvalError);
    console.log("reached 1");
    const existingAccessCode = await prisma.accessCode.findFirst({
      where: {
        code: accessCode,
      },
    });
    if (!existingAccessCode) throw new Error(errors.accessCodeError);
    const { userId, orderId } = existingAccessCode;

    const existingApprovalStatus = await prisma.userApproval.findFirst({
      where: {
        userId,
        orderId,
      },
    });
    console.log("reached 2");
    if (!existingApprovalStatus) {
      const newApprovalStatus = await prisma.userApproval.create({
        data: {
          userId,
          orderId,
          approvalStatus,
        },
      });
      console.log(
        `Created a new approval status "${approvalStatus}" for user ${userId} on order ${orderId}`
      );
      return res.status(OK).send(newApprovalStatus);
    } else {
      const updatedApprovalStatus = await prisma.userApproval.update({
        where: {
          id: existingApprovalStatus.id,
        },
        data: {
          approvalStatus,
        },
      });
      console.log(
        `Updated approval status to "${approvalStatus}" for user ${userId} on order ${orderId}`
      );
      return res.status(OK).send(updatedApprovalStatus);
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage === errors.accessCodeError)
      return res.status(FORBIDDEN).send(message(errorMessage));
    else if (errorMessage === errors.approvalError)
      return res.status(BAD_REQUEST).send(message(errorMessage));
    else
      return res.status(INTERNAL_SERVER_ERROR).send(message("Unknown error."));
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
