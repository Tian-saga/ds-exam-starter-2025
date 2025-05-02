import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, GetCommand
} from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async event => {
  const movieId = Number(event.pathParameters!.movieId);
  const role    = event.queryStringParameters?.role;
  if (!role) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing role query parameter" })
    };
  }

  const { Item } = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { movieId, role }
  }));
  if (!Item) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Not found" })
    };
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Item)
  };
};
