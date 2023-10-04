import * as GPIO from 'onoff'; // GPIO library for Raspberry Pi

import { PublishCommandInput, IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'; // AWS IoT Data Plane typings

// GPIO pin where the PIR motion sensor is connected
const PIR_PIN = 17; // Change to the actual GPIO pin number you're using

// AWS IoT Core settings
const iotClient = new IoTDataPlaneClient({
  endpoint: 'your-iot-endpoint', // Change to your AWS IoT endpoint
  region: 'us-east-1', // Change to your desired AWS region
});

const iotTopic = 'your/iot/topic'; // Change to your desired IoT topic

// Initialize GPIO
const motionSensor = new GPIO.Gpio(PIR_PIN, 'in', 'both');

// Function to publish motion detection
const publishMotionDetection = async () => {
  const message = {
    event: 'motion_detected',
    timestamp: Math.floor(Date.now() / 1000), // Convert to seconds
  };

  const params: PublishCommandInput = {
    topic: iotTopic,
    payload: JSON.stringify(message),
  };
  const publishCommand = new PublishCommand(params);
  try {
    const response = await iotClient.send(publishCommand);
    console.log(`Motion detected - message published to AWS IoT Core, Request Id: ${response.$metadata.requestId}`);
  } catch (e) {
    console.error('Error publishing message to AWS IoT Core:', e);
    throw e;
  }
};

export const DetectMotionAndNotify = async () => {
  try {
    console.log('PIR Motion Sensor Example (Ctrl+C to exit)');
    motionSensor.watch((err: any, value: number) => {
      if (err) {
        console.error('Error watching GPIO:', err);
        return;
      }

      if (value === 1) {
        publishMotionDetection();
      }
    });

    process.on('SIGINT', () => {
      console.log('Exiting...');
      motionSensor.unexport();
      process.exit();
    });
  } catch (error) {
    console.error('Error:', error);
  }
};
