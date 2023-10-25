import express, { json } from "express";
import { prisma } from "./client";
import { FORBIDDEN, OK } from "./statusCodes";
import { message } from "./utility";
import { fetchWooCommerceOrder } from "./fetch";

const app = express();
app.use(json());

//TODO: validate all inputs (like zod middleware would do)

//get data associated with access code
app.get("/access-codes/:code", async (req, res) => {
  const code = req.params.code;
  const accessCode = await prisma.accessCode.findUnique({
    where: {
      code,
    },
    include: {
      user: true,
      order: true,
    },
  });

  if (!accessCode) {
    return res.status(FORBIDDEN).send(message("Invalid access code."));
  }

  const fetchOrderResult = await fetchWooCommerceOrder(
    accessCode.order.wcOrderId
  );
  if (fetchOrderResult.statusCode !== OK) {
    res
      .status(fetchOrderResult.statusCode)
      .send(message(fetchOrderResult.message));
  }

  res.status(OK).send(fetchOrderResult.data);
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
