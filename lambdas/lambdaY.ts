import { SNSHandler } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: process.env.REGION });
const QUEUE_B_URL = process.env.QUEUE_B_URL!;

export const handler: SNSHandler = async event => {
  for (const record of event.Records) {
    const msg = JSON.parse(record.Sns.Message);

    // 如果缺少 email，就发到 QueueB，然后跳过后续处理
    if (!msg.email) {
      await sqs.send(new SendMessageCommand({
        QueueUrl:    QUEUE_B_URL,
        MessageBody: JSON.stringify(msg),
      }));
      console.log("Re-routed to QueueB (missing email):", msg);
      continue;
    }

    // 否则正常处理
    console.log("Processed by LambdaY:", msg);
  }
};
