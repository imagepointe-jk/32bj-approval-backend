import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

//TODO: The email should ideally not be sent from my work email!
const fromAddress = "josh.klope@imagepointe.com";
const password = process.env.NODEMAILER_PASS;
if (!password) {
  console.error("No password found for nodemailer");
}

const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  tls: {
    ciphers: "SSLv3",
  },
  auth: {
    user: fromAddress,
    pass: password,
  },
});

export function sendEmail(
  recipientAddress: string,
  subject: string,
  message: string
) {
  const email: Mail.Options = {
    from: fromAddress,
    to: recipientAddress,
    subject,
    html: message,
  };
  transporter.sendMail(email, (err, info) => {
    if (err) {
      return console.error(err);
    }
    console.log(`Successfully sent an email to ${recipientAddress}`);
  });
}
