import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, QueryCommand, GetCommand
} from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async event => {
  const movieId = Number(event.pathParameters!.movieId);
  const role    = event.queryStringParameters?.role;

  // —— case 1: /crew/movies/{movieId}?role=xxx ——
  if (role) {
    const { Item } = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { movieId, role }
    }));
    if (!Item) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Not found" }) };
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(Item) };
  }

  // —— case 2: /crew/movies/{movieId} —— Query 全部同分区数据
  const { Items } = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "movieId = :m",
    ExpressionAttributeValues: { ":m": movieId },
  }));
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Items)
  };
};
