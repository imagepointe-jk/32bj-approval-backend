import { frontEndURL } from "../constants";
import { ApprovalStatus, Role } from "../sharedTypes";
import { UserWithDbData } from "../types";
import { isOrderFullyApproved } from "../utility";

export type EmailData = {
  recipientAddress: string;
  subject: string;
  message: string;
};

const genericSalutation = (recipientName: string) =>
  `<p>Hi ${recipientName},</p>`;
export const genericSubject = (orderId: number) =>
  `Update On Order #${orderId}`;
export const fullyApprovedSubject = (orderId: number) =>
  `Order #${orderId} Fully Approved`;
export const canceledSubject = (orderId: number) =>
  `Order #${orderId} Canceled`;
const genericMessageStart = (orderId: number) =>
  `<p>This is to notify you that there has been an update to Order #${orderId}.</p>`;
const closingLine = "<p>Thank you,<br>-Image Pointe Team</p>";
const contactUsLink =
  '<a href="https://www.imagepointe.com/contact-us/">contact us</a>';
const goToAppLink = (accessCode: string, orderId: number) =>
  `<a href="${frontEndURL}/${accessCode}">Go to Order #${orderId}</a>`;

export function generateEmailsAfterApprovalStatusChange(
  roleThatChanged: Role,
  newStatus: ApprovalStatus,
  orderId: number,
  usersData: UserWithDbData[]
): EmailData[] {
  const userThatChanged = usersData.filter(
    (user) => user.role === roleThatChanged
  )[0];
  const usersWithoutArtist = usersData.filter((user) => user.role !== "artist");

  //if all approvals are in, all we want is the approval emails
  const isFullyApproved = isOrderFullyApproved(usersData);
  if (isFullyApproved) {
    const fullyApprovedEmails: EmailData[] = usersData.map((user) => ({
      recipientAddress: user.email,
      subject: fullyApprovedSubject(orderId),
      message: generateFullyApprovedMessage(user.name, orderId),
    }));
    return fullyApprovedEmails;
  }

  //if ANYONE requested a revision, EVERYONE should be notified
  if (newStatus === "revise") {
    const genericEmails: EmailData[] = usersData.map((user) => ({
      recipientAddress: user.email,
      subject: genericSubject(orderId),
      message:
        user.name === userThatChanged.name
          ? generateGenericStatusChangeConfirmation(
              user.name,
              newStatus,
              orderId,
              user.accessCode
            )
          : generateGenericStatusChangeMessage(
              user.name,
              userThatChanged.name,
              newStatus,
              orderId,
              user.accessCode
            ),
    }));
    return genericEmails;
  }

  //if someone tried to cancel/actually canceled...
  else if (newStatus === "cancel") {
    //...send a tentative cancellation message if it was the approver...
    if (userThatChanged.role === "approver") {
      const cancelEmails: EmailData[] = usersWithoutArtist.map((user) => {
        const recipientAddress = user.email;
        const subject = genericSubject(orderId);
        const message = generateTentativeCancelMessage(
          user.name,
          userThatChanged.name,
          orderId,
          user.accessCode,
          user.name === userThatChanged.name
        );

        return { recipientAddress, subject, message };
      });
      return cancelEmails;
      //...or a real cancellation message if it was the requester or releaser.
    } else {
      const cancelEmails: EmailData[] = usersWithoutArtist.map((user) => {
        const recipientAddress = user.email;
        const subject = canceledSubject(orderId);
        const message =
          user.name === userThatChanged.name
            ? generateCancelConfirmation(user.name, orderId)
            : generateRealCancelMessage(
                user.name,
                userThatChanged.name,
                orderId
              );

        return { recipientAddress, subject, message };
      });
      return cancelEmails;
    }
  }

  //if ANYONE changed their status to "approve" or "undecided", send EVERYONE BUT THE ARTIST a generic update email.
  else {
    const genericEmails: EmailData[] = usersWithoutArtist.map((user) => {
      const recipientAddress = user.email;
      const subject = genericSubject(orderId);
      //if this is the user that made the change, send them a confirmation instead of a generic message
      const message =
        user.name === userThatChanged.name
          ? generateGenericStatusChangeConfirmation(
              user.name,
              newStatus,
              orderId,
              user.accessCode
            )
          : generateGenericStatusChangeMessage(
              user.name,
              userThatChanged.name,
              newStatus,
              orderId,
              user.accessCode
            );

      return { recipientAddress, subject, message };
    });
    return genericEmails;
  }
}

export function generateFullyApprovedMessage(
  recipientName: string,
  orderId: number
) {
  return `${genericSalutation(recipientName)}
  <p>This is to notify you that order #${orderId} has been fully approved, and will be
  moving on to production.</p>
  ${closingLine}`;
}

export function generateGenericStatusChangeMessage(
  recipientName: string,
  userThatChanged: string,
  newStatus: ApprovalStatus,
  orderId: number,
  recipientAccessCode: string
) {
  return `${genericSalutation(recipientName)}
    ${genericMessageStart(orderId)}
    <p>${userThatChanged} has changed their status to "${newStatus}."</p>
    <p>Please click the link below to review the order and take action if necessary.</p>
    <p>${goToAppLink(recipientAccessCode, orderId)}</p>
    ${closingLine}`;
}

export function generateRealCancelMessage(
  recipientName: string,
  userThatChanged: string,
  orderId: number
) {
  return `${genericSalutation(recipientName)}
    <p>This is to inform you that ${userThatChanged} has chosen to cancel Order #${orderId}.</p>
    <p>Please ${contactUsLink} if you have any questions.</p>
    ${closingLine}`;
}

export function generateTentativeCancelMessage(
  recipientName: string,
  userThatChanged: string,
  orderId: number,
  recipientAccessCode: string,
  isConfirmation: boolean
) {
  const secondLine = isConfirmation
    ? `<p>This is to inform you that you have successfully requested a cancellation on Order #${orderId}.</p>`
    : `<p>This is to inform you that ${userThatChanged} has requested that Order #${orderId} be canceled.</p>`;

  return `${genericSalutation(recipientName)}
    ${secondLine}
    <p>The order has NOT been canceled yet. Please visit the order page to see if your input is needed.</p>
    <p>${goToAppLink(recipientAccessCode, orderId)}</p>
    ${closingLine}`;
}

export function generateGenericStatusChangeConfirmation(
  recipientName: string,
  newStatus: string,
  orderId: number,
  recipientAccessCode: string
) {
  return `${genericSalutation(recipientName)}
    <p>This is to confirm that you have changed your status on Order #${orderId} to "${newStatus}".</p>
    <p>Feel free to return to the order approval page to check for updates or change your status again.</p>
    <p>${goToAppLink(recipientAccessCode, orderId)}</p>
    ${closingLine}`;
}

export function generateCancelConfirmation(
  recipientName: string,
  orderId: number
) {
  return `${genericSalutation(recipientName)}
    <p>This is to inform you that you have successfully canceled Order #${orderId}.</p>
    <p>Please ${contactUsLink} if you have any questions.</p>
    ${closingLine}`;
}
