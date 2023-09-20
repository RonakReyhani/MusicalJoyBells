### How to connect Raspberry to internet:

Wired Connection (Ethernet):
The Raspberry Pi 2 Model B has an Ethernet port, which allows you to connect it directly to your router or network switch using an Ethernet cable (LAN cable). Follow these steps:
Connect one end of an Ethernet cable to the Ethernet port on your Raspberry Pi 2 Model B.
Connect the other end of the Ethernet cable to an available port on your router or network switch.
Power up your Raspberry Pi.
The Raspberry Pi should automatically detect the wired network connection, and you should have internet access.

### Power for Raspberry

a charger

### Connect to PI

### Register PI in AWS IOT

- Turn on your device and make sure it's connected to the internet.
- Choose how you want to load files onto your device.
- If your device supports a browser, open the AWS IoT console on your device and run this wizard. You can download the files directly to your device from the browser.
- If your device doesn't support a browser, choose the best way to transfer files from the computer with the browser to your device. Some options to transfer files include using the file transfer protocol (FTP) and using a USB memory stick.
- Make sure that you can access a command-line interface on your device.
- If you're running this wizard on your IoT device, open a terminal window on your device to access a command-line interface.
- If you're not running this on your IoT device, open an SSH terminal window on this device and connect it to your IoT device.
- From the terminal window, enter this command:
  ping XXXXXXXXX-ats.iot.ap-southeast-2.amazonaws.com
  After you complete these steps and get a successful ping response, you're ready to continue and connect your device to AWS IoT.

### Raspberry to talk to AWS

Set a rules for MQTT topic

### Workflow

![workflow](./workflow.png)

- Rule with SNS Action to send notification to SNS topic to text the host: "Your guests are here"

- SNS topic to notify with SMS that a guest just arrived at the door.
<!-- - lambda to send a random welcome message with person's name to polly and get the audio back -->
- lambda to get a random music from s3 bucket and sends the audios to SQS
- logic on raspberry to play the audio

### AWS Resources:

- Lambda on edge device that publishes two messages to MQTT topic when diagnoses a motion.

```py
import RPi.GPIO as GPIO
import time
import boto3
import json

# GPIO pin where the PIR motion sensor is connected
PIR_PIN = 17  # Change to the actual GPIO pin number you're using

# AWS IoT Core settings
iot_client = boto3.client('iot-data')
iot_topic = 'your/iot/topic'  # Change to your desired IoT topic

def setup_gpio():
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(PIR_PIN, GPIO.IN)

def motion_detected():
    return GPIO.input(PIR_PIN)

def publish_motion_detection():
    message = {
        'event': 'motion_detected',
        'timestamp': int(time.time())
    }
    iot_client.publish(
        topic=iot_topic,
        payload=json.dumps(message)
    )
    print("Motion detected - message published to AWS IoT Core")

if __name__ == '__main__':
    try:
        setup_gpio()
        print("PIR Motion Sensor Example (Ctrl+C to exit)")
        while True:
            if motion_detected():
                publish_motion_detection()
            time.sleep(1)  # Check for motion every 1 second
    except KeyboardInterrupt:
        print("Exiting...")
    finally:
        GPIO.cleanup()
```

- first rule MQTT: SNS topic to send text notification with number subscription
- second rule MQTT: to trigger lambda to get a random music from S3 bucket
- third rule MQTT: for IOT device to receive the audio file when it's sent to SQS
- S3 bucket
- IAM roles
- SQS Queue
- Lambda function to get the file from S3 bucket and publish message with audio data to SQS queue.

```py
import boto3
# Replace 'queue_url' with the URL of your SQS queue
queue_url = 'https://sqs.us-east-1.amazonaws.com/123456789012/AudioQueue'  # Replace with your queue URL
s3_bucket_name = 'your-s3-bucket-name'  # Replace with your S3 bucket name
s3_object_key = 'path/to/your/audiofile.mp3'  # Replace with the S3 object key

def lambda_handler(event, context):
    try:
        # Create an S3 client
        s3 = boto3.client('s3')

        # Download the audio file from S3
        response = s3.get_object(Bucket=s3_bucket_name, Key=s3_object_key)
        audio_data = response['Body'].read()

        # Create an SQS client
        sqs = boto3.client('sqs')

        # Send the audio data to the SQS queue
        response = sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=audio_data
        )

        print("Audio data sent to SQS successfully.")
        return {
            'statusCode': 200,
            'body': 'Audio data sent to SQS successfully.'
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': 'Failed to send audio data to SQS.'
        }
```

- Lambda on IOT device to play the audio:

```py
import boto3
import pydub
from pydub.playback import play

# AWS IoT Core settings
iot_client = boto3.client('iot-data')
iot_topic = 'your/iot/topic'  # Change to your IoT topic

def on_message(client, userdata, message):
    try:
        # Decode the message payload
        audio_data = message.payload.decode('utf-8')

        # Create an AudioSegment from the audio data
        audio_segment = pydub.AudioSegment.from_file(io.BytesIO(audio_data), format="mp3")

        # Play the audio segment
        play(audio_segment)

        print("Audio played successfully")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    try:
        # Initialize your IoT client (e.g., MQTT or AWS IoT SDK)
        # Subscribe to the IoT topic where audio messages are published
        # Set the on_message callback to handle incoming audio messages
        # Connect to the IoT broker

        print("Listening for audio messages from AWS IoT Core (Ctrl+C to exit)")

        # Keep the program running to listen for incoming audio messages
        while True:
            pass

    except KeyboardInterrupt:
        print("Exiting...")



```
