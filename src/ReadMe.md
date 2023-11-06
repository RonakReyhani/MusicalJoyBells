## Home Security Hacks: Mixing The Right Ingredients On AWS For A Fun Christmas

In the world of GenAI applications, we often overlook the amazing tools provided by cloud service providers like AWS for exploring Machine Learning.

AWS, in particular, offers a comprehensive set of services, covering Data Analytics and Real-Time Data Streaming. When you combine these with AI and ML services like Amazon Rekognition, you can tap into Machine Learning without the complexity of setting up infrastructure or the costs and time required to train models from scratch.

To learn and understand these services, the best approach is to get hands-on. I start by thinking about real-world scenarios, explore existing solutions, and then build my own using the tech and tools I'm comfortable with.

With the new year approaching, I wanted to welcome my guests in a unique way. I remembered my neglected security camera and had an idea. What if I could use it to capture my visitors' arrivals and create a system that not only informs me when they arrive but also recommends a Christmas song to keep them entertained while I get ready to welcome them to the party.

Great! We now have the idea, let's call it "Christmas Musical Joy".

### Recipe for Christmas Musical Joy

- 1 IP Camera
- 1 Amazon Kinesis Video Stream
- A pinch of Amazon Rekognition
- 1 Amazon Kinesis Data Stream
- 1 AWS Lambda Function
- 1 Amazon SNS Topic
- A dash of IAM Roles and Access Policies

### Guided Tour of the Diagram

Understanding the essential cake ingredients is just the beginning; it's the art of blending them that gives each cake its unique flavor. Similarly, now that we have the recipe for crafting our Christmas Musical Joy tool, let's dive into the intricacies of the designed architecture and follow the instructions to bring it to life.

![architecture diagram](../architecture/architecture.png)

In our tech recipe, the key ingredient is an IP camera. While numerous approaches exist for this project, I opted for the one readily available to me. I chose to utilize an IP camera (Tapo C310) because it supports RTSP (Real-Time Streaming Protocol). But why RTSP, you ask? It's essential for streaming the captured video from the camera and seamlessly feeding it into a Stream Service delivery, such as Amazon Kinesis Video Streams.

With our real-time video stream successfully ingested into Kinesis Video Streams, you might be wondering, "What's next?" How does this tool recognize my visitors, and which tools help us achieve that? These are valid questions, but we've got the answers. All it takes is Amazon Rekognition Stream Producer and Face Collection.

Once the Live Video Data reaches Amazon Rekognition, it diligently combs through a collection of images from various individuals. As soon as it spots a match, the results are streamed out. But we can't stop there; we need another delivery tool to seamlessly convey the analysis results from Amazon Rekognition to a destination like an AWS Lambda function. For this purpose, I've enlisted the assistance of Amazon Kinesis Data Streams.

Once the face matching result arrives at the AWS Lambda function, the possibilities are endless. We have the freedom to utilize it in whichever way we desire – whether that means sending a joyful text message to notify us of our guest's arrival, complete with our visitor's name, or even treating them to a delightful Christmas song while they wait for our warm welcome at the entrance.

### Instruction To Mix The Ingredients  

Instead of following the typical left-to-right approach from the guided diagram, building this tool requires us to start from the top and move downwards, left to right. While some manual setup steps are necessary to create the resources, I've used the Infrastructure As Code (IAC) approach for other resource creation that are required for this project.

Please note that Amazon Kinesis Video Streams (KVS) availability is limited in certain regions. To optimize performance and ensure support for the KVS service, it's essential to deploy the stack in a region that is both geographically close to you and a supported region for KVS.

__Resources provided in cloudformation.yml (in this repo)[].__

### Amazon Kinesis Resources

- Create Kinesis Video Stream && Amazon Kinesis Data stream:

```
//cloudformation.yml

# Amazon Kinesis Data Stream
  ChristmasMusicalJoyDataStream:
    Type: "AWS::Kinesis::Stream"
    Properties: 
      Name: christmas-musical-joy-Data-Stream
      ShardCount: 1
# Amazon Kinesis Video Stream
  ChristmasMusicalJoyVideoStream:
    Type: AWS::KinesisVideo::Stream
    Properties:
      DataRetentionInHours: 24
      Name: christmas-musical-joy-Video-Stream

```

### Rekognition Iam Role
  - We need an IAM role for Amazon Rekognition service that allows Rekognition to get the Video Data stream from Amazon Kinesis Video Streams service and put the Facial Match Records into Amazon Kinesis Data Stream, for that we need a policy like this:
__Provided in cloudformation.yaml__

  ```
//cloudformation.yml

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "kinesis:PutRecord",
                "kinesis:PutRecords"
            ],
            "Resource": "<KINESIS-DATA-STREAM-ARN>"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kinesisvideo:GetDataEndpoint",
                "kinesisvideo:GetMedia"
            ],
            "Resource": "<KINESIS-VIDEO-STREAM-ARN>"
        }
    ]
}
```

### S3 Bucket To Store The audios & Face Samples
``` 
//cloudformation.yml

ChristmasAudioBucket:
    Type: AWS::S3::Bucket
    Properties:
      AccessControl: Private
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      BucketName: <YOUR_BUCKET_NAME>
      
```

### Create Face collection (Manual Step AWS CLI)
This is a manual step, you need to have set up your AWS CLI and configured your credentials to be able to run this command successfully. 

- Create Face collection:
We need to provide the known faces as a collection to Amazon Rekognition so that on live stream it can analyse and find the matches. 

```  
    aws rekognition create-collection \
        --collection-id <FACE_COLLECTION_NAME> \
        --region <AWS_REGION>
```


- Add face to face collection:

I have stored the face examples which are just simple photos with`.jpg` format in a S3 Bucket. 

*Tip: make sure the region of your bucket is same as face collection*

```
  aws rekognition index-faces \
    --image '{"S3Object":{"Bucket":"<BUCKET_NAME>","Name":"<FILE_NAME>.jpg"}}' \
    --collection-id "<COLLECTION_ID>" \
    --detection-attributes "ALL" \
    --external-image-id "<FACE-TAG>" \
    --region <AWS_REGION>

```

- To get a list of your collection, you can run the following command: 

```    
    aws rekognition list-faces \
        --collection-id <COLLECTION_ID>
```


### Rekognition Stream Producer (Manual Step AWS CLI)

- Set up the Rekognition Video Stream Processor:

This is the heart of the system. It pulls video from Kinesis video, analyzes it & pushes the results to Kinesis data. 

```
aws rekognition create-stream-processor \
    --name PROCESSOR_NAME \
    --role-arn IM_ROLE_ARN \
    --settings '{"FaceSearch":{"CollectionId":"FACE_COLLECTION_ID"}}' \
    --input '{"KinesisVideoStream":{"Arn":"KINESIS_VIDEO_STREAM_ARN"}}' \
    --stream-processor-output '{"KinesisDataStream":{"Arn":"KINESIS_DATA_STREAM_ARN"}}'

```
```
output:

{
    "SessionId": "e9c078f3-ba26-41a3-9c19-6d08444e504c"
}

```

__Some Useful Commands__:

- List Rekognition Stream Producer:

```
aws rekognition list-stream-processors
```

When we initially create the Rekognition Stream Producer the default status is "STOPPED".

```
output:
{
    "StreamProcessors": [
        {
            "Name": "musical-joy-rekognition-processor",
            "Status": "STOPPED"
        }
    ]
}
```

- Start Rekognition Stream Producer:
To Start the Rekognition Stream Producer run the following command:

```
aws rekognition start-stream-processor \
    --name <PROCESSOR_NAME>

```
- List Rekognition Stream Producer:

Now, with listing the Stream Producers we see the Status has changed to "RUNNING".

```
aws rekognition list-stream-processors
```

```
{
    "StreamProcessors": [
        {
            "Name": "musical-joy-rekognition-processor",
            "Status": "RUNNING"
        }
    ]
}

```

### Camera Streaming to Kinesis (Manual Step- CLI)

Let's review how much progress we made, So far we created resources that helps us deliver the video stream, including Kinesis Video and Kinesis Data Stream, Amazon Rekognition Stream producer and the permissions it requires to be able to get the stream records from KVS. It was simple and straightforward, Now it's time to enable the Ip Camera to stream the live video data into KVS. 

For that, we have to follow these few steps:

#### Get the IP address of the camera 
Simply login to your Network router and find your Device IP.

#### Set up Camera Account
Any type of IP camera you choose, they usually have an application to enable users to interact with the camera, for my Tapo C310 camera, I Set up the TP-Link App and created a camera account. This credential is used with Amazon Kinesis Video Stream's Client for authentication. This is something different from your TP-Link App account, if you do not provide these credentials KVS will fail to get the stream from Camera. if you are using the same camera as mine [here is the instruction](https://www.tp-link.com/us/support/faq/2790/) on how to create your camera account.


#### Connect the Camera as a stream source (Producer) for Kinesis Video Stream.
/// talk about kinesis producer and client and the docker image

This seems to be very complex but thanks to Docker we can build the entire environment as a Docker image and use one of the provided samples from [AWS Amazon Kinesis Repository](https://github.com/awslabs/amazon-kinesis-video-streams-producer-sdk-cpp/blob/master/samples/kvs_gstreamer_sample.cpp).

1- Set up docker if it's first time using Docker [get Docker](https://docs.docker.com/get-docker/).
2- Copy provided Docker File [in the source repo](####) to the root of your project.
3- Build and Run the docker image:
        
```
        docker build -t <YOUR_IMAGE_NAME> .
        <!-- List docker images and find your image ID -->
        docker images   
        docker run -it <YOU_IMAGE_ID>

```
#### Run the gstreamer sample app with the requisite arguments

In your running docker execute the following command

``` 
AWS_ACCESS_KEY_ID=<AWS_ACCESS_KEY_ID> \
AWS_SECRET_ACCESS_KEY=<AWS_SECRET_ACCESS_KEY> \
./kvs_gstreamer_sample <STREAM_NAME> <RTSP_URL>

```

*Tip1: Make sure that you are Authenticate with your AWS credentials. Set up aws config within your Docker.*

*Tip2: The <RTSP_URL> url is typically something in this format rtsp://camera_username:camera_password@10.0.0.42:554/stream1*


### Set Up Telegram ChatBot

Simply follow instruction from (this web page)[https://sendpulse.com/knowledge-base/chatbot/telegram/create-telegram-chatbot], I am storing my API Token in Amazon Secrets Manager Service to get the secret in my (InformHost)[####] Lambda Function to send the visitors names and the music file to my telegram bot.

### Deploy Resources as Infrastructure as Code
We still need other resources like lambda functions to get the stream record from Amazon Kinesis Data stream, Amazon SNS Topic and so on. go ahead and continue with build, package and deploying the resources.

*In this project I have not set up CI/CD, if you are planing to productionise this project, make sure this step is part of your continues deployment process.*

*Remember to start your Chatbot before proceeding with deployment process*

#### Build and Package
```
npm run build
npm run package
```

### Package Cloudformation Resources (Manual AWS CLI)

```
aws cloudformation package --template-file ./cloudformation.yaml --s3-bucket $ARTIFACT_BUCKET --output-template-file /<FOLDER>/cloudformation.yaml

```
#### Deploy Resources (Manual AWS CLI)

```
aws cloudformation deploy \
  --template /path_to_template/my-template.yml \
  --stack-name <STACK_NAME> \
  --parameter-overrides Key1=Value1 Key2=Value2 \

```

### Tasting Time

TO DO Short Demo of application

### Clean up
After you’ve played with it to your heart’s content, it’s time to destroy it all! Follow these steps:

- Stop the Docker container.
- Stop & delete the stream processor:
```aws rekognition stop-stream-processor --name <REKOGNITION_STREAM_PRODUCER>```
```aws rekognition delete-stream-processor --name <REKOGNITION_STREAM_PRODUCER>```
- Delete cloudformation stack.
- Delete the Rekognition faces collection:
```aws rekognition delete-collection --collection-id <COLLECTION_ID```
- Delete the S3 bucket.