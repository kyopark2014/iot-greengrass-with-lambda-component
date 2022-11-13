# CDK로 Greengrass에 Lambda component 배포하여 이용하기

Lambda 함수는 AW의 대표적인 서버리스 서비스로 시스템에 유연함을 제공하여, 다양한 어플리케이션에서 널리 사용되고 있습니다. IoT 같은 디바이스들은 Lambda API를 호출하는 방식으로 필요한 동작을 수행할 수 있습니다. 하지만, 이 경우에 디바이스 숫자들이 많아지면 서버 증설과 비용에 대해 충분히 검토하여야 합니다.

Lambda의 기능을 디바이스로 가져와서 수행한다면, 비용을 줄이고, offline 상황에서 디바이스의 동작을 좀 더 원할하게 할 수 있습니다. 이를 위해서 Greengrass에서는 Lambda를 component로 등록하여 사용할 수 있도록 하고 있습니다. 

## Greengrass 설치

[greengrass-installation](https://github.com/kyopark2014/iot-greengrass/blob/main/preparation.md#greengrass-installation)에 따라 greengrass 디바이스에 greengrass를 설치하고 core device로 등록합니다.

## CDK로 component 설치

[CDK로 Greengrass에 Lambda component 배포](https://github.com/kyopark2014/iot-greengrass-with-lambda-component/blob/main/cdk-lambda-component/)에서는 CDK에서 Lambda compoent를 구성하고 배포하는 방식에 대해 설명하고 있습니다. 


## 실행 결과 

수신된 메시지는 아래와 같습니다. "com.example.publisher"가 전송된 json 파일이 정상적으로 "com.example.lambda"로 수신되고 있음을 알 수 있습니다.

```java
2022-11-13T17:15:43.327Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,Event : . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:43.327Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4, . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:43.327Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,{"key1": "value1", "key2": "value2", "key3": "value3"}. {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:48.332Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,Event : . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:48.332Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4, . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:48.333Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,{"key1": "value1", "key2": "value2", "key3": "value3"}. {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
```

이때, 설치된 component 정보는 아래와 같이 확인합니다. "com.example.publisher"와 "com.example.lambda"가 정상적으로 설치된것을 볼수 있습니다. 특이점은 별도 deployment를 설정하지 않았음에도 아래와 같이 "aws.greengrass.LambdaLauncher", "aws.greengrass.TokenExchangeService", "DeploymentService", "aws.greengrass.LambdaManager"이 설치된 것을 알 수 있습니다. 

```java
sudo /greengrass/v2/bin/greengrass-cli component list

INFO: Socket connection /greengrass/v2/ipc.socket:8033 to server result [AWS_ERROR_SUCCESS]
Nov 13, 2022 5:15:34 PM software.amazon.awssdk.eventstreamrpc.EventStreamRPCConnection$1 onProtocolMessage
INFO: Connection established with event stream RPC server
Components currently running in Greengrass:

Component Name: com.example.publisher
    Version: 1.0.0
    State: RUNNING
    Configuration: {"accessControl":{"aws.greengrass.ipc.pubsub":{"com.example.publisher:pubsub:1":{"operations":["aws.greengrass#PublishToTopic"],"policyDescription":"Allows access to publish to all topics.","resources":["*"]}}}}
    
Component Name: com.example.lambda
    Version: 1.0.0
    State: RUNNING
    Configuration: {"containerMode":"GreengrassContainer","containerParams":{"devices":{},"memorySize":16384.0,"mountROSysfs":false,"volumes":{}},"inputPayloadEncodingType":"json","lambdaExecutionParameters":{"EnvironmentVariables":{}},"maxIdleTimeInSeconds":60.0,"maxInstancesCount":100.0,"maxQueueSize":1000.0,"pinned":true,"pubsubTopics":{"0":{"topic":"local/topic","type":"PUB_SUB"}},"statusTimeoutInSeconds":60.0,"timeoutInSeconds":3.0}    
    
Component Name: aws.greengrass.LambdaLauncher
    Version: 2.0.10
    State: FINISHED
    Configuration: {}
Component Name: aws.greengrass.TokenExchangeService
    Version: 2.0.3
    State: RUNNING
    Configuration: {"activePort":45359.0}
Component Name: aws.greengrass.LambdaRuntimes
    Version: 2.0.8
    State: FINISHED
    Configuration: {}
Component Name: DeploymentService
    Version: 0.0.0
    State: RUNNING
    Configuration: null
Component Name: aws.greengrass.LambdaManager
    Version: 2.2.6
    State: RUNNING
    Configuration: {"getResultTimeoutInSecond":"60"}    
```

