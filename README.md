# CDK로 Greengrass에 Lambda component 배포하여 이용하기

## Greengrass 설치 

## CDK로 component 설치


[Local Publisher 생성](https://github.com/kyopark2014/iot-greengrass-with-ipc-client-v2)을 참조하여 publisher를 생성합니다. 

## 실행 결과 

설치된 component 정보는 아래와 같이 확인합니다. "com.example.publisher"와 "com.example.lambda"가 정상적으로 설치된것을 볼수 있습니다. 특이점은 별도 deployment를 설정하지 않았음에도 아래와 같이 "aws.greengrass.LambdaLauncher", "aws.greengrass.TokenExchangeService", "DeploymentService", "aws.greengrass.LambdaManager"이 설치된 것을 알 수 있습니다. 

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


수신된 메시지는 아래와 같습니다. 

```java
2022-11-13T17:15:43.327Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,Event : . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:43.327Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4, . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:43.327Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,{"key1": "value1", "key2": "value2", "key3": "value3"}. {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:48.332Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,Event : . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:48.332Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4, . {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
2022-11-13T17:15:48.333Z [INFO] (pool-2-thread-48) com.example.lambda: lambda_function.py:4,{"key1": "value1", "key2": "value2", "key3": "value3"}. {serviceInstance=0, serviceName=com.example.lambda, currentState=RUNNING}
```
