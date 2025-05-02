import { SQSEvent } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
   
    let payload: any;
    try {
      const envelope = JSON.parse(record.body);
      payload = JSON.parse(envelope.Message);
    } catch {
     
      payload = record.body;
    }
    console.log("LambdaX received (via SQS):", payload);
  }
};
