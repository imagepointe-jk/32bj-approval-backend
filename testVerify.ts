import * as crypto from "crypto";

const incomingSig = "j40a3ouXJY1NtJUy22Hid0akPqR8M4uuygysIfQno3I=";
const secret = '/8Jf";({UzP(P-<,_KKK`RHn.g&{6i';
// Get the signature from the header
// var signature = req.headers['x-wc-webhook-signature'];
// Get the raw body of the request
// var rawBody = req.rawBody;
// Create a hash of the raw body using the secret key and the SHA256 algorithm
// var sig = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
var sig = crypto.createHmac("sha256", secret).digest("base64");
console.log(sig);
