#!/bin/bash

npm run build
npm run package
aws cloudformation package --template-file ./cloudformation.yaml --s3-bucket christmas-joy-face-collection-bucket --output-template-file ./.build/cloudformation.yml
aws cloudformation deploy \
  --template-file ./.build/cloudformation.yml \
  --stack-name christmas-musical-joy-stack \
  --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
  --parameter-overrides TelegramBotAPIKey=XXXXXXXXX
