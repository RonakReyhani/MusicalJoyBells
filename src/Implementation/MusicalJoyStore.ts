import { IMusicalJoy } from '../Interface/MusicalJoyBell';

import { SNSClient, PublishCommandInput, PublishCommand } from '@aws-sdk/client-sns';
import { FaceDetail } from '@aws-sdk/client-rekognition';
import {
  GetObjectCommand,
  ListObjectsCommand,
  ListObjectsCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FaceMatch } from 'aws-sdk/clients/rekognition';


let instance: IMusicalJoy;

const REGION = `${process.env.AWS_REGION}`;
const snsTopicArn = `${process.env.SNS_TOPIC}`;

interface FaceSearchResponse {
  DetectedFace: FaceDetail;
  MatchedFaces: FaceMatch[];
}
interface TelegramUpdatesResponse {
  result: {
    message: {
      chat: {
        id: number;
      };
    };
  }[];
}


export function getMusicJoyInstance(): IMusicalJoy {
  /* istanbul ignore next */
  if (!instance) {
    const s3Client = new S3Client({ region: REGION });
    const snsClient = new SNSClient({ region: REGION });
    const secretManagerClient = new SecretsManagerClient({ region: REGION });
    instance = new musicalJoyDB(s3Client, snsClient,secretManagerClient);
  }
  return instance;
}

class musicalJoyDB implements IMusicalJoy {
  private readonly bucketName: string;
  private readonly secretName: string;

  constructor(private s3Client: S3Client, private snsClient: SNSClient, private secretManagerClient: SecretsManagerClient) {
    this.bucketName = `${process.env.BUCKET_NAME}`;
    this.secretName = `${process.env.SECRET_NAME}`

  }
  // ----------- GENERAL EXPORT Helpers -------------------------------------------------//

  async getAPIKeySecret ()  {

    const params = {
      SecretId: this.secretName,
    };
    try {
      const command = new GetSecretValueCommand(params);
      const response = await this.secretManagerClient.send(command);
      if (response.SecretString) {
        const result = JSON.parse(response.SecretString);
        return result.apiKey;
      } else {
        console.error('Secret string not found in response.');
        throw new Error('Secret string not found in response.');
      }
    } catch (error) {
      console.error('Error getting secret:', error);
      throw error;
    }
  };
  
  async listS3Objects  () {
    // ListObjectsRequest
    const input: ListObjectsCommandInput = {
      Bucket: this.bucketName,
    };
    const listCommand = new ListObjectsCommand(input);
    try {
      const listOfMusics = (await this.s3Client.send(listCommand)).Contents;
      return listOfMusics;
    } catch (error) {
      console.error('Error listing S3 objects:', error);
      throw error;
    }
  };
  
  convertHttpsToHttp  (httpsUrl: string): string {
    // Check if the URL starts with "https://" (case-insensitive)
    if (httpsUrl.match(/^https:\/\//i)) {
      // Replace "https://" with "http://"
      const httpUrl = httpsUrl.replace(/^https:\/\//i, "http://");
      return httpUrl;
    }
    // If the input URL is not an HTTPS URL, return it as-is
    return httpsUrl;
  }
  
  async getPresignedUrl (fileKey: string){
    const getObjectCommand = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });
    
    // Generate the pre-signed URL
    const getSignedUrlCommand = getSignedUrl(this.s3Client, getObjectCommand, {
      expiresIn: 3600,
    });
    try {
      const url = await getSignedUrlCommand;
      return url
    }catch(e){
      const err= e as Error
      throw new Error(`unable to generate presigned url ${err.message}`)
    }
  }
  
  async getRandomMusic  ()  {
    try {
      // List all the objects in the bucket
      const listOfMusics = await this.listS3Objects();
      // get a random name from the list
      if (listOfMusics && listOfMusics.length > 0) {
        const randomIndex = Math.floor(Math.random() * listOfMusics.length);
        const randomMusicKey = listOfMusics[randomIndex].Key!;
        // download the random file
        // const musicFile = await getObject(bucketName, randomMusicKey);
        console.log('---musicFile', randomMusicKey);
        return randomMusicKey;
      } else {
        throw new Error('The S3 bucket is empty');
      }
    } catch (e) {
      const err = e as Error;
      throw new Error(`Failed to get a random file from s3 and send to sqs queue  ${err.message ?? err}`);
    }
  };
  
  async getChatId  (token: string)  {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = (await response.json()) as TelegramUpdatesResponse;
    if (data.result.length > 0) {
      // The chat ID of the latest message
      const chatId = data.result[0].message.chat.id;
      console.log(`Chat ID: ${chatId}`);
      return chatId;
    } else {
      console.error('No messages found.');
    }
  };
  
  async sendMusicToChatBot  (token: string, caption: string, audioUrl: string) {
    const TELEGRAM_CHAT_ID = await this.getChatId(token);
    // Create a FormData object to send the audio file
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID); // The chat ID of the channel
    formData.append("caption", caption)
    formData.append('audio', audioUrl); // Provide the URL to your MP3 file
  
    console.log("---form data", formData)
    // Make the HTTP POST request to send the audio
    const url = `https://api.telegram.org/bot${token}/sendAudio`;
      try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      console.log("---send audio response", response)
      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Telegram API request failed: ${response.status} - ${responseBody}`);
      }
  
      const json = await response.json();
      console.log(json);
    } catch (error) {
      const err = error as Error
      console.error('Error sending audio to Telegram:', error);
      throw new Error(err.message)
    }
  };


  // ----------- CLASS METHODS -----------------------------------//
  async getVideoAnalysis(record: { kinesis: { data: string } }): Promise<{ statusCode: number; body: string }> {
    let visitors: string[] = [];
    // find all matched faces with similarity over 98%

    console.log('-----data', Buffer.from(record.kinesis.data, 'base64').toString('ascii'));
    const KinesisResult = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    const parsedResult = JSON.parse(KinesisResult);
    console.log('-----parsedResult', parsedResult);
    // construct the visitors list and send it to SNS topic
    parsedResult.FaceSearchResponse.map((response: FaceSearchResponse) => {
      let result = response.MatchedFaces.filter(
        (matchFace: FaceMatch) => matchFace.Similarity && matchFace.Similarity > 98,
      ).map((x) => x.Face?.ExternalImageId)[0]!;
      console.log('--matched faces', result);
      visitors.push(result);
    });
    const uniqueVisitors = [...new Set(visitors)];
    console.log('--uniqueVisitors', uniqueVisitors.join(', '));

    // Publish the message to the SNS topic
    const params: PublishCommandInput = {
      Message: uniqueVisitors.join(', '),
      TopicArn: snsTopicArn,
    };

    const snsCommand = new PublishCommand(params);
    try {
      await this.snsClient.send(snsCommand);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Successfully sent the face tag name to SNS.' }),
      };
    } catch (e) {
      console.error('Error:', e);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send the face tag name to SNS.' }),
      };
    }
  }

  async informHost(visitors: string): Promise<void> {
    try{
      const telegramBotApiKey = await this.getAPIKeySecret();
      const surpriseFileKey = await this.getRandomMusic();
      const audioUrl = await this.getPresignedUrl(surpriseFileKey)
      const httpurl = this.convertHttpsToHttp(audioUrl)
      const caption = `You have visitor(s): ${visitors}\n\r Play the song to welcome your guests.`;
      await this.sendMusicToChatBot(telegramBotApiKey, caption, httpurl)

    }catch(e) {
      console.log(e);
      const err = e as Error;
      throw new Error(err.message);
    }
  }
}
