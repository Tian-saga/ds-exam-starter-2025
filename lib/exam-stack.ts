import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { movieCrew } from "../seed/movies";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsSubscription, LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";

export class ExamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Question 1 - Serverless REST API

    // A table that stores data about a movie's crew, i.e. director, camera operators, etc.
    const table = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "role", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "ExamTable",
    });

    const question1Fn = new lambdanode.NodejsFunction(this, "Question1Fn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/question1.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: table.tableName,
        REGION: "eu-west-1",
      },
    });

    new custom.AwsCustomResource(this, "moviesddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [table.tableName]: generateBatch(movieCrew),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [table.tableArn],
      }),
    });

    const api = new apig.RestApi(this, "ExamAPI", {
      description: "Exam api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const crew = api.root.addResource("crew");
    const movies = crew.addResource("movies");
    const byMovie = movies.addResource("{movieId}");

    table.grantReadWriteData(question1Fn);

    byMovie.addMethod(
      "GET",
      new apig.LambdaIntegration(question1Fn),
      {
        requestParameters: {
          "method.request.querystring.role": false  // false = 可选参数
        }
      }
    );
    

    //const anEndpoint = api.root.addResource("patha");




    // ==================================
    // Question 2 - Event-Driven architecture

     const bucket = new s3.Bucket(this, "exam-bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    const topic1 = new sns.Topic(this, "Topic1", {
      displayName: "Exam topic",
    });
    
    new cdk.CfnOutput(this, "Topic1Arn", {
      value: topic1.topicArn,
      description: "The ARN of SNS Topic1",
    });
    

    const queueB = new sqs.Queue(this, "QueueB", {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });

    

    const queueA = new sqs.Queue(this, "queueA", {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });
    
    const lambdaXFn = new lambdanode.NodejsFunction(this, "LambdaXFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/lambdaX.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REGION: "eu-west-1",
      },
    });

    const lambdaYFn = new lambdanode.NodejsFunction(this, "LambdaYFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/lambdaY.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REGION: "eu-west-1",
      },
    });
    
    lambdaYFn.addEnvironment("QUEUE_B_URL", queueB.queueUrl);
    queueB.grantSendMessages(lambdaYFn);

    topic1.addSubscription(new subs.SqsSubscription(queueA, {
      filterPolicy: {
        country: SubscriptionFilter.stringFilter({
          allowlist: ["Ireland", "China"]
        })
      }
    }));
    

   
    lambdaXFn.addEventSource(
      new SqsEventSource(queueA, { batchSize: 1 })
    );
    queueA.grantConsumeMessages(lambdaXFn);

   
    topic1.addSubscription(new subs.LambdaSubscription(lambdaYFn, {
      filterPolicy: {
        country: SubscriptionFilter.stringFilter({
          denylist: ["Ireland", "China"]
        })
      }
    }));
    
    




  }
}
  