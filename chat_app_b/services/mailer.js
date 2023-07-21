const { SESv2, SendEmailCommand } = require("@aws-sdk/client-sesv2");
const REGION = "ap-northeast-2";
const sesClient = new SESv2({ region: REGION });


const sendSGMail = async ({
  to,
  sender,
  subject,
  html,
  attachments,
  text,
}) => {
  try {
    const from = process.env.DEV_EMAIL;

    const params = {
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Body: {
            Html: { Data: html },
          },
          Subject: { Data: subject },
        },
      },
      FromEmailAddress: from,
    };
    const data = sesClient.send(new SendEmailCommand(params));
    return data;
  } catch (error) {
    console.log(error);
  }
};

exports.sendEmail = async (args) => {
  if (!process.env.NODE_ENV === "development") {
    return Promise.resolve();
  } else {
    return sendSGMail(args);
  }
};
