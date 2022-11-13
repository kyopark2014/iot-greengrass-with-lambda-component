import json

def handler(event, context):  
    print('Event : ', json.dumps(event))
    
    return {
        'statusCode': 200,
        'body': json.dumps(event)
    }