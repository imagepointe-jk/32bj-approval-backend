import { UserWithDbData } from "./types";

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

export function isOrderFullyApproved(usersData: UserWithDbData[]) {
  const totalApprovals = usersData.reduce(
    (accum, item) => (item.approvalStatus === "approve" ? accum + 1 : accum),
    0
  );
  const usersWithoutArtist = usersData.filter((user) => user.role !== "artist");
  return totalApprovals >= usersWithoutArtist.length; // full approval does not depend on artist
}
