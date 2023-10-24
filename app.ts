import express, { json } from "express";
import { prisma } from "./client";
import { FORBIDDEN } from "./statusCodes";
import { message } from "./utility";

const app = express();
app.use(json());

//get data associated with access code
app.get("/:accessCode", async (req, res) => {
  const orderWithAccessCode = await prisma.order.findFirst({
    where: {
      accessCode: req.params.accessCode,
    },
    include: {
      users: true,
    },
  });

  if (!orderWithAccessCode) {
    return res.status(FORBIDDEN).send(message("Invalid access code"));
  }

  res.status(200).send(orderWithAccessCode);
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

const port = process.env.PORT;
app.listen(port || 3000, () => console.log(`Listening on port ${port}`));
