# CDK로 Greengrass에 Lambda component 배포

## CDK 초기화

[AWS CDK](https://github.com/kyopark2014/technical-summary/blob/main/cdk-introduction.md)를 참조하여 아래와 같이 CDK를 초기화 합니다.

```java
mkdir cdk-lambda-component && cd cdk-lambda-component
cdk init app --language typescript
```

아래처럼 Boostraping을 수행합니다. 이것은 1회만 수행하면 됩니다. 

```java
cdk bootstrap aws://123456789012/ap-northeast-2
```

여기서 "123456789012"은 AccountID로서 "aws sts get-caller-identity --query Account --output text"로 확인할 수 있습니다. 

CDK V2가 설치되지 않은 경우에 아래와 같이 aws-cdk-lib를 설치합니다.

```java
npm install -g aws-cdk-lib
```


## CDK Code 작성하기

[cdk-lambda-component-stack.ts](https://github.com/kyopark2014/iot-greengrass-with-lambda-component/blob/main/cdk-lambda-component/lib/cdk-lambda-component-stack.ts)에 필요한 Cloud 서비스를 배치합니다. 

Lamba와 Version을 아래와 같이 생성합니다. 

```java
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
```    

[Local Publisher 생성](https://github.com/kyopark2014/iot-greengrass-with-ipc-client-v2)을 참조하여 publisher를 생성합니다.


Artifact를 저장하기 위한 S3 bucket을 생성하고 파일을 복사합니다. 

```java
    // S3 for artifact storage
    const s3Bucket = new s3.Bucket(this, "gg-depolyment-storage",{
      bucketName: "gg-depolyment-storage",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });


    // copy web application files into s3 bucket
    new s3Deploy.BucketDeployment(this, "UploadArtifact", {
      sources: [s3Deploy.Source.asset("../src")],
      destinationBucket: s3Bucket,
    });
```    

S3를 생성하고 복사하는 시간을 생각하여 나머지는 다중스택으로 아래와 같이 설치합니다. 

```java
    // create lambda component - com.example.lambda
    new lambdaComponent(scope, "lambda-component", version.version, ggLambda.functionArn)   

    // create local component
    new localComponent(scope, "local-component", s3Bucket.bucketName)   

    // deploy components - com.example.publisher
    new componentDeployment(scope, "deployments", version.version, accountId, deviceName)   
```

이때의 각 스택은 아래와 같습니다. 

```java
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
```
