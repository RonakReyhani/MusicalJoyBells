import { SNSEvent } from 'aws-lambda';
import { getMusicJoyInstance } from '../Implementation/MusicalJoyStore';

exports.handler = async (event: SNSEvent) => {
  console.log('----event', JSON.stringify(event));
  const visitors = event.Records[0].Sns.Message;
  const musicalJoyInstance = getMusicJoyInstance();
  await musicalJoyInstance.informHost(visitors);
};
