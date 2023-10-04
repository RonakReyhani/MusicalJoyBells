import {
  GetObjectCommand,
  GetObjectCommandInput,
  ListObjectsCommand,
  ListObjectsCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand, SendMessageCommandInput } from '@aws-sdk/client-sqs';
import { Readable } from 'stream';

const sqsQueueUrl = `${process.env.SQS_URL}`;
const s3BucketName = `${process.env.BUCKET_NAME}`;
const s3Client = new S3Client({ region: 'ap-southeast-2' });
const sqsClient = new SQSClient({ region: 'ap-southeast-2' });

const listS3Objects = async (bucket: string) => {
  // ListObjectsRequest
  const input: ListObjectsCommandInput = {
    Bucket: s3BucketName,
  };
  const listCommand = new ListObjectsCommand(input);
  try {
    const listOfMusics = (await s3Client.send(listCommand)).Contents;
    return listOfMusics;
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    throw error;
  }
};

const getObject = async (bucket: string, key: string) => {
  const input: GetObjectCommandInput = {
    Bucket: bucket,
    Key: key,
  };
  const getObjectCommand = new GetObjectCommand(input);

  try {
    const response = await s3Client.send(getObjectCommand);
    const readableStream = response.Body as Readable;
    const data: Buffer[] = [];

    readableStream.on('data', (chunk) => {
      data.push(chunk);
    });

    return new Promise<Buffer>((resolve, reject) => {
      readableStream.on('end', () => {
        resolve(Buffer.concat(data));
      });
      readableStream.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error retrieving S3 object:', error);
    throw error;
  }
};

const sendMusicToSQS = async (musicData: Buffer) => {
  const encodedMusic = musicData.toString('base64');
  const input: SendMessageCommandInput = {
    QueueUrl: sqsQueueUrl,
    MessageBody: encodedMusic,
  };
  const sendMessageCommand = new SendMessageCommand(input);

  try {
    const { MessageId } = await sqsClient.send(sendMessageCommand);
    console.log(`Music file sent to SQS successfully. Message Id is: ${MessageId}`);
  } catch (error) {
    console.error('Error sending message to SQS:', error);
    throw error;
  }
};

export const getRandomMusic = async () => {
  try {
    // List all the objects in the bucket
    const listOfMusics = await listS3Objects(s3BucketName);
    // get a random name from the list
    const randomIndex = Math.floor(Math.random() * listOfMusics!.length);
    const randomMusic = listOfMusics![randomIndex].Key;
    // download the random file
    const musicFile = await getObject(s3BucketName, randomMusic!);
    // Send the music to sqs
    sendMusicToSQS(musicFile);
  } catch (e) {
    const err = e as Error;
    throw new Error(`Failed to get a random file from s3 and send to sqs queue  ${err.message ?? err}`);
  }
};
