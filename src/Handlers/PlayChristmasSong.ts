import * as Alexa from 'ask-sdk-core';

const LaunchRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput: Alexa.HandlerInput) {
    const speakOutput = 'Welcome to the Christmas Song Player. Nadia will be with you shortly.';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const PlayChristmasSongHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayChristmasSongIntent';
  },
  handle(handlerInput: Alexa.HandlerInput) {
    // You can integrate with an audio service to play a Christmas song here.
    const speakOutput = 'Playing a Christmas song. Enjoy!';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const CustomMessageHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CustomMessageIntent';
  },
  handle(handlerInput: Alexa.HandlerInput) {
    const guestName = Alexa.getSlotValue(handlerInput.requestEnvelope, 'GuestName');
    const speakOutput = `Dear ${guestName}, Nadia will be with you shortly.`;
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayChristmasSongHandler,
    CustomMessageHandler
  )
  .lambda();
