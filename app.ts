import express, { json } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { validateRequest } from "zod-express-middleware";
import { prisma } from "./client";
import {
  imagePointeArtist,
  imagePointeEditor,
  organizationReleaser,
  organizationSources,
  testApprover,
} from "./constants";
import {
  createAccessCode,
  createComment,
  createOrder,
  createOrganization,
  createRole,
  createUser,
  getDataForAccessCode,
} from "./dbLogic";
import { AppError } from "./error";
import {
  fetchWooCommerceOrder,
  modifyWooCommerceLineItems,
  uploadOrderImageToWordpress,
} from "./fetch";
import { sendEmail } from "./mail/mail";
import { WorkflowData } from "./sharedTypes";
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  OK,
} from "./statusCodes";
import {
  accessCodeParamsSchema,
  approvalPostBodySchema,
  commentPostBodySchema,
} from "./types";
import { message, printWebhookReceived } from "./utility";
import {
  parseDateInString,
  parseLineItemModifications,
  parseWebhookRequest,
  parseWooCommerceOrderJson,
} from "./validations";

const app = express();
const devMode = app.get("env") === "development";

const allowedOrigins: string[] = [];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (devMode || allowedOrigins.includes(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(json());

const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

//TODO: validate all inputs (like zod middleware would do)

//get data associated with access code
app.get("/workflow/:accessCode", async (req, res) => {
  try {
    const accessCode = req.params.accessCode;
    //use the access code to figure out what user and order we're viewing
    //this comes from our db
    const { userData, wcOrderId, organizationName, imageUrl, comments } =
      await getDataForAccessCode(accessCode);

    const wooCommerceOrder = await fetchWooCommerceOrder(wcOrderId);

    const workflowData: WorkflowData = {
      organizationName,
      wcOrderId: wooCommerceOrder.id,
      lineItems: wooCommerceOrder.lineItems,
      total: wooCommerceOrder.total,
      totalTax: wooCommerceOrder.totalTax,
      feeLines: wooCommerceOrder.feeLines,
      shippingTotal: wooCommerceOrder.shippingTotal,
      imageUrl,
      userData,
      comments,
    };

    res.status(OK).send(workflowData);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).send(error.message);
    }
    if (error instanceof ZodError) {
      console.error(error);
      return res.status(BAD_REQUEST).send(error);
    }
    return res.status(INTERNAL_SERVER_ERROR).send(message("Unknown error."));
  }
});

//receive webhook from WooCommerce
//! This is technically a security vulnerability.
//! Tried to find a way to verify genuine WC webhooks, but there is almost no documentation on how to do this, and all my attempts have failed so far.
//! Likely not a major risk for this project, but something to come back to if there's time.
//! Note that an attacker would need to both know the server URL and mimic the exact webhook schema specified in this project.
app.post("/", async (req, res) => {
  printWebhookReceived(req.headers, req.body);
  try {
    const parsedRequest = parseWebhookRequest(req);
    //if the developer password is provided, we can return access codes for testing purposes
    const isDeveloperRequest =
      parsedRequest.headers.webhookDevPass === process.env.WEBHOOK_DEV_PASS;

    const {
      billing: { email, first_name },
      id: wcOrderId,
    } = parsedRequest.body;
    const { webhookSource } = parsedRequest.headers;
    //create organization
    const organizationSource = organizationSources.find(
      (source) => source.webhookSource === webhookSource
    );
    if (!organizationSource) {
      console.error(`Received a webhook from unknown source ${webhookSource}`);
      throw new AppError(
        "Webhook",
        FORBIDDEN,
        `The webhook source ${webhookSource} is not recognized`
      );
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
    console.error(`Error creating order following a webhook: ${error}`);
    res.status(200).send(); //always send a 200 back to WC, to avoid breaking their brittle webhook
  }
});

app.post(
  "/workflow/:accessCode/approval",
  validateRequest({
    body: approvalPostBodySchema,
    params: accessCodeParamsSchema,
  }),
  async (req, res) => {
    const { approvalStatus } = req.body;
    const { accessCode } = req.params;
    try {
      const existingAccessCode = await prisma.accessCode.findFirst({
        where: {
          code: accessCode,
        },
      });

      if (!existingAccessCode)
        throw new AppError("Authentication", FORBIDDEN, "Invalid access code.");
      const { userId, orderId } = existingAccessCode;

      const existingApprovalStatus = await prisma.userApproval.findFirst({
        where: {
          userId,
          orderId,
        },
      });
      //if an approval status entry for this user on this order doesn't exist yet, create one
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
        //if an approval status entry for this user on this order DOES exist already, update it
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
      if (error instanceof AppError) {
        return res.status(error.statusCode).send(message(error.message));
      }
      return res.status(INTERNAL_SERVER_ERROR).send(message("Unknown error."));
    }
  }
);

app.put("/workflow/:accessCode/order/line-items", async (req, res) => {
  try {
    const accessCode = req.params.accessCode;
    const { userData, wcOrderId } = await getDataForAccessCode(accessCode);

    if (userData.activeUser.role !== "editor")
      throw new AppError(
        "Authentication",
        FORBIDDEN,
        "You must be an editor on this order to edit it."
      );

    const parsedLineItemsIn = parseLineItemModifications(req.body.line_items);
    const response = await modifyWooCommerceLineItems(
      wcOrderId,
      parsedLineItemsIn
    );
    if (!response.ok)
      throw new AppError(
        "WooCommerce Integration",
        response.status,
        "Server error."
      );

    const json = await response.json();
    const parsedLineItemsOut = parseWooCommerceOrderJson(json).lineItems;
    return res.status(OK).send(parsedLineItemsOut);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).send(message(error.message));
    }
    return res.status(INTERNAL_SERVER_ERROR).send(message("Unknown error."));
  }
});

app.post(
  "/workflow/:accessCode/image",
  upload.single("file"),
  async (req, res) => {
    const accessCode = req.params.accessCode;
    const { wcOrderId, userData } = await getDataForAccessCode(accessCode);

    if (userData.activeUser.role !== "artist")
      throw new AppError(
        "Authentication",
        FORBIDDEN,
        "You must be an artist on this order to edit the image."
      );

    const file = req.file;
    if (!file)
      throw new AppError("Request", BAD_REQUEST, "No file found for upload.");
    try {
      const response = await uploadOrderImageToWordpress(wcOrderId, file);
      const json = await response.json();
      if (!response.ok)
        throw new AppError(
          "WooCommerce Integration",
          INTERNAL_SERVER_ERROR,
          "Server error."
        );

      res.status(200).send(json);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).send(message(error.message));
      }
    }
  }
);

app.post(
  "/workflow/:accessCode/comments",
  validateRequest({
    body: commentPostBodySchema,
    params: accessCodeParamsSchema,
  }),
  async (req, res) => {
    try {
      const { dateCreated, text, approvalStatus } = req.body;
      const parsedDate = parseDateInString(dateCreated); //parsing here because zod middleware would not accept the dateInString schema

      const existingAccessCode = await prisma.accessCode.findFirst({
        where: {
          code: req.params.accessCode,
        },
      });
      if (!existingAccessCode)
        throw new AppError("Authentication", FORBIDDEN, "Invalid access code.");

      const { orderId, userId } = existingAccessCode;
      const createdComment = await createComment(
        text,
        userId,
        orderId,
        parsedDate,
        approvalStatus
      );
      return res.status(OK).send(createdComment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(BAD_REQUEST).send(error);
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).send(message(error.message));
      }
      res.status(INTERNAL_SERVER_ERROR).send(message("Unknown error."));
    }
  }
);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
