import { getMusicJoyInstance } from '../Implementation/MusicalJoyStore';

exports.handler = async (event: { Records: { kinesis: { data: string } }[] }) => {
  console.log('--event', JSON.stringify(event));

  const record = event.Records[0];
  const musicalJoyInstance = getMusicJoyInstance()
  return await musicalJoyInstance.getVideoAnalysis(record);
};
