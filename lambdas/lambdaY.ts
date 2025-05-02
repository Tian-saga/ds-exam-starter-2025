import { SNSEvent } from "aws-lambda";

export const handler = async (event: SNSEvent): Promise<void> => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    console.log("LambdaY received (direct SNS):", message);
  }
};
