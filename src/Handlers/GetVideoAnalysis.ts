import {SNSClient, PublishCommandInput, PublishCommand} from '@aws-sdk/client-sns';

const AWS_REGION = `${process.env.AWS_REGION}`
const snsClient = new SNSClient({region: AWS_REGION});
const snsTopicArn = `${process.env.SNS_TOPIC}`;

export const handler = async (event: any, context: any) => {
  try {
    // TO DO: Extract the face tag name from the Rekognition payload
    const faceTagName = event.FaceDetails[0].Face.Name; // Replace with your payload structure
    // Compose the message you want to send to the SNS topic
    // TO DO: This might be array of names
    const message = `Your Visitor(s) ${faceTagName} has arrived.`;
    const params: PublishCommandInput = {
      Message: message,
      TopicArn: snsTopicArn,

    } 
    // Publish the message to the SNS topic
    const snsCommand = new PublishCommand(params)
    await snsClient.send(snsCommand)
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully sent the face tag name to SNS.' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send the face tag name to SNS.' }),
    };
  }
};
