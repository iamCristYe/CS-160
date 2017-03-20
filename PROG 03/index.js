'use strict';

var CARD_TITLE = "Recipe Assistant";

exports.handler = function (event, context) {
    if (event.session.new) {
        onSessionStarted({requestId: event.request.requestId}, event.session);
    }

    if (event.request.type === "LaunchRequest") {
        onLaunch(event.request,
            event.session,
            function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
    } else if (event.request.type === "IntentRequest") {
        onIntent(event.request,
            event.session,
            function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
    } else if (event.request.type === "SessionEndedRequest") {
        onSessionEnded(event.request, event.session);
        context.succeed();
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if ("SearchIntent" === intentName) {
    	handleSearchRequest(intent, session, callback);
    } else if ("HelpIntent" === intentName) {
    	handleHelpRequest(intent, session, callback); //Other intents ot yet completed
    } else if ("PrevIntent" === intentName) {
    } else if ("NextIntent" === intentName) {
    } else if ("IngredientsIntent" === intentName) {
    } else if ("DirectionsIntent" === intentName) {
    } else if ("StartIntent" === intentName) {
    } else if ("AMAZON.StartOverIntent" === intentName) {
    } else if ("AMAZON.YesIntent" === intentName) {
    } else if ("AMAZON.NoIntent" === intentName) {
    } else if ("AMAZON.RepeatIntent" === intentName) {
    } else if ("AMAZON.StopIntent" === intentName) {
    } else {
        throw "Invalid intent";
    }
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the app
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Good bye!", "", true));
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function getWelcomeResponse(callback) {
    console.log("Welcomed");
    var sessionAttributes = {},
        speechOutput = "Recipe assistant, what recipe would you like to make?";
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": speechOutput,
        "mainDialog": true,
        "recipeDialog": false
    };
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}

//All of the intents are handled below

function handleSearchRequest(intent, session, callback) {
    console.log("Search Request");
    /*
	NOT COMPLETED
	*/
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, false));
}

function handleHelpRequest(intent, session, callback) {
	var speechOutput = "You can search for a recipe by saying <break time='500ms'/> 'Find' then your recipe name. For example, <break time='500ms'/> 'Find pork chops'.\
	Similar commands include: <break time='500ms'/> How do I cook coconut milk corned beef and cabbage? <break time='500ms'/> How do I make\
	homemade cookies? <break time='500ms'/> I would like to prepare carrot cake oatmeal. <break time='500ms'/> Search for\
	Shepherd's Pie. You can also use the commands <break time='500ms'/> 'exit' an <break time='500ms'/> 'quit' to leave the app."
	sessionAttributes = {
		"speechOutput": speechOutput,
        "repromptText": speechOutput,
        "mainDialog": session.attributes.mainDialog,
        "recipeDialog": session.attributes.recipeDialog
	};
	callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}
