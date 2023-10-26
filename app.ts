import express, { json } from "express";
import { getDataForAccessCode } from "./dbLogic";
import { fetchWooCommerceOrder } from "./fetch";
import { WorkflowData } from "./sharedTypes";
import { OK } from "./statusCodes";
import { message } from "./utility";

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
  const { userData, wcOrderId } = data;
  const fetchOrderResult = await fetchWooCommerceOrder(wcOrderId);
  const fetchedOrderData = fetchOrderResult.data;
  if (fetchOrderResult.statusCode !== OK || !fetchedOrderData) {
    return res
      .status(fetchOrderResult.statusCode)
      .send(message(fetchOrderResult.message));
  }

  const workflowData: WorkflowData = {
    wcOrderId,
    orderTotal: fetchedOrderData.total,
    users: userData.users,
    activeUser: userData.activeUser,
  };

  res.status(OK).send(workflowData);
});

//receive webhook from WooCommerce
app.post("/", (req, res) => {
  console.log("Received request==============");
  console.log("headers:");
  console.log(req.headers);
  console.log("body:");
  console.log(req.body);
  res.status(200).send();
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
