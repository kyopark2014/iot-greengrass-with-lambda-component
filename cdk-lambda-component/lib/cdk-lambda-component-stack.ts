import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment"
import * as greengrassv2 from 'aws-cdk-lib/aws-greengrassv2';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export class CdkLambdaComponentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const deviceName = 'GreengrassCore-18163f7ac3e'
    const accountId = cdk.Stack.of(this).account

    // Create greengrass Lambda
    const ggLambda = new lambda.Function(this, "lambda-greengrass", {
      description: 'lambda function',
      runtime: lambda.Runtime.PYTHON_3_8, 
      code: lambda.Code.fromAsset("../src/lambda"), 
      functionName: 'lambda-greengrass',
      handler: "lambda_function.handler", 
      timeout: cdk.Duration.seconds(3),
      environment: {}
    }); 

    // version
    const version = ggLambda.currentVersion;
    const alias = new lambda.Alias(this, 'LambdaAlias', {
      aliasName: 'Dev',
      version,
    });

    // Lambda function url for simple endpoint
    const fnUrl = ggLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM // NONE,
    });

    // define the role of function url
    const fnUrlRole = new iam.Role(this, 'fnUrlRole', {
      assumedBy: new iam.AccountPrincipal(cdk.Stack.of(this).account),
      description: 'Role for lambda function url',
    });    

    // apply the defined role
    fnUrl.grantInvokeUrl(fnUrlRole);

    // check the arn of funtion url role
    new cdk.CfnOutput(this, 'fnUrlRoleArn', {
      value: fnUrlRole.roleArn,
      description: 'The arn of funtion url role',
    });    

    // check the address of lambda funtion url
    new cdk.CfnOutput(this, 'EndpointUrl', {
      value: fnUrl.url,
      description: 'The endpoint of Lambda Function URL',
    });

    // S3 for artifact storage
    const s3Bucket = new s3.Bucket(this, "gg-depolyment-storage",{
      bucketName: "gg-depolyment-storage",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });
    new cdk.CfnOutput(this, 'bucketName', {
      value: s3Bucket.bucketName,
      description: 'The nmae of bucket',
    });
    new cdk.CfnOutput(this, 's3Arn', {
      value: s3Bucket.bucketArn,
      description: 'The arn of s3',
    });
    new cdk.CfnOutput(this, 's3Path', {
      value: 's3://'+s3Bucket.bucketName,
      description: 'The path of s3',
    });

    // copy web application files into s3 bucket
    new s3Deploy.BucketDeployment(this, "UploadArtifact", {
      sources: [s3Deploy.Source.asset("../src")],
      destinationBucket: s3Bucket,
    });

    // check the value of lambdaArn
    new cdk.CfnOutput(this, 'lambdaArn', {
      value: ggLambda.functionArn,
      description: 'lambdaArn',
    });

    // check the version of lambda
    new cdk.CfnOutput(this, 'version', {
      value: version.version,
      description: 'The version of lambda',
    });   

    // create lambda component - com.example.lambda
    new lambdaComponent(scope, "lambda-component", version.version, ggLambda.functionArn)   

    // create local component
    new localComponent(scope, "local-component", s3Bucket.bucketName)   

    // deploy components - com.example.publisher
    new componentDeployment(scope, "deployments", version.version, accountId, deviceName)   
  }
}

export class lambdaComponent extends cdk.Stack {
  constructor(scope: Construct, id: string, version: string, lambdaArn: string, props?: cdk.StackProps) {    
    super(scope, id, props);

    const cfnComponentVersion_lambda = new greengrassv2.CfnComponentVersion(this, 'LambdaCfnComponentVersion', {
      lambdaFunction: {
        componentLambdaParameters: {
          environmentVariables: {},
          eventSources: [{
            topic: 'local/topic',
            type: 'PUB_SUB',   // 'PUB_SUB'|'IOT_CORE'
          }],
          inputPayloadEncodingType: 'json',   // 'json'|'binary',
          linuxProcessParams: {
            containerParams: {
              memorySizeInKb: 16384,
              mountRoSysfs: false,
            },
            isolationMode: 'GreengrassContainer',  // 'GreengrassContainer'|'NoContainer',
          },
          maxIdleTimeInSeconds: 60,
          maxInstancesCount: 100,
          maxQueueSize: 1000,
          pinned: true,
          statusTimeoutInSeconds: 60,
          timeoutInSeconds: 3,
        }, 
        componentName: 'com.example.lambda',  // optional
        componentVersion: version+'.0.0',  // optional
        lambdaArn: lambdaArn+':'+version,
      },
    }); 
  }
}

export class localComponent extends cdk.Stack {
  constructor(scope: Construct, id: string, bucketName: string, props?: cdk.StackProps) {    
    super(scope, id, props);

    // recipe of component - com.example.publisher
    const version = "1.0.0"
    const recipe_publisher = `{
      "RecipeFormatVersion": "2020-01-25",
      "ComponentName": "com.example.publisher",
      "ComponentVersion": "${version}",
      "ComponentDescription": "A component that publishes messages.",
      "ComponentPublisher": "Amazon",
      "ComponentConfiguration": {
        "DefaultConfiguration": {
          "accessControl": {
            "aws.greengrass.ipc.pubsub": {
              "com.example.publisher:pubsub:1": {
                "policyDescription": "Allows access to publish to all topics.",
                "operations": [
                  "aws.greengrass#PublishToTopic"
                ],
                "resources": [
                  "*"
                ]
              }
            }
          }
        }
      },
      "Manifests": [{
        "Platform": {
          "os": "linux"
        },
        "Lifecycle": {
          "Install": "pip3 install awsiotsdk",
          "Run": "python3 -u {artifacts:path}/publisher.py"
        },
        "Artifacts": [{
          "URI": "${'s3://'+bucketName}/publisher/artifacts/com.example.publisher/1.0.0/publisher.py"
        }]
      }]
    }`

    // recipe of component - com.example.publisher
    new greengrassv2.CfnComponentVersion(this, 'MyCfnComponentVersion-Publisher', {
      inlineRecipe: recipe_publisher,
    });        
  }
}

export class componentDeployment extends cdk.Stack {
  constructor(scope: Construct, id: string, version: string, accountId: string, deviceName: string, props?: cdk.StackProps) {    
    super(scope, id, props);

    // deployments
    const cfnDeployment = new greengrassv2.CfnDeployment(this, 'MyCfnDeployment', {
      targetArn: `arn:aws:iot:ap-northeast-2:`+accountId+`:thing/`+deviceName,    
      components: {
        "com.example.publisher": {
          componentVersion: "1.0.0", 
        },
        "com.example.lambda": {
          componentVersion: version+".0.0", 
        },
        "aws.greengrass.Cli": {
          componentVersion: "2.8.1", 
        }
      },
      deploymentName: 'deployment-components',
      deploymentPolicies: {
        componentUpdatePolicy: {
          action: 'NOTIFY_COMPONENTS', // NOTIFY_COMPONENTS | SKIP_NOTIFY_COMPONENTS
          timeoutInSeconds: 60,
        },
        failureHandlingPolicy: 'ROLLBACK',  // ROLLBACK | DO_NOTHING
      },
    });   
  }
}
