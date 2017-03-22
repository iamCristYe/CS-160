'use strict';

console.log('Loading function');

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

var Alexa = require('alexa-sdk');

var APP_ID = "amzn1.ask.skill.83fa4658-9238-4af1-84b3-9ba7764ae2d8";

var states = {
    MAIN: '_MAIN',
    INGREDIENTS: '_INGREDIENTS',
    DIRECTIONS: '_DIRECTIONS'
};

var tableData = [];


/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */
exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    if (event.httpMethod) {
        const done = (err, res) => callback(null, {
            statusCode: err ? '400' : '200',
            body: err ? err.message : JSON.stringify(res),
            headers: {
                'Content-Type': 'application/json', 'Access-Control-Allow-Headers': 'x-requested-with',
                "Access-Control-Allow-Origin" : "*", "Access-Control-Allow-Credentials" : true,
            },
        });

        switch (event.httpMethod) {
            case 'DELETE':
                dynamo.deleteItem(JSON.parse(event.body), done);
                break;
            case 'GET':
                dynamo.scan({ TableName: event.queryStringParameters.TableName }, done);
                break;
            case 'POST':
                dynamo.putItem(JSON.parse(event.body), done);
                break;
            case 'PUT':
                dynamo.updateItem(JSON.parse(event.body), done);
                break;
            default:
                done(new Error(`Unsupported method "${event.httpMethod}"`));
        }
    } else {
        if (event.session.attributes.tableData === undefined) {
            dynamo.scan({
                TableName : "RecipesList"
            }, function(err, data) {
                if (err) {
                    console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("Scan succeeded.");
                    tableData = data["Items"];
                    var alexa = Alexa.handler(event, context);
                    alexa.APP_ID = APP_ID;
                    alexa.registerHandlers(newSessionHandlers, mainHandlers, ingredientsHandlers, directionsHandlers);
                    alexa.execute();
                }
            });
        } else {
            var alexa = Alexa.handler(event, context);
            alexa.APP_ID = APP_ID;
            alexa.registerHandlers(newSessionHandlers, mainHandlers, ingredientsHandlers, directionsHandlers);
            alexa.execute();
        }
    }
    
};

var newSessionHandlers = {
    'LaunchRequest': function () {
        this.handler.state = states.MAIN;
        this.attributes.tableData = tableData;
        this.attributes.speechOutput = "Recipe assistant, what recipe would you like to make?";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'SessionEndedRequest': function () {
        this.emitWithState('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput);
    },
};

var mainHandlers = Alexa.CreateStateHandler(states.MAIN, {
    'SearchIntent': function () {
        var param = this.event.request.intent.slots.Recipe.value.toLowerCase();
        var recipeExists = false;
        for (var i in this.attributes.tableData) {
            var name = this.attributes.tableData[i].RecipeName.toLowerCase();
            if (name === param) {
                this.attributes.ingredients = this.attributes.tableData[i].IngredientsList.split("\\");
                this.attributes.directions = this.attributes.tableData[i].PrepDirections.split("\\");
                this.attributes.speechOutput = "Found one recipe for " + name + ". Say 'what are the ingredients' for the list of ingredients or 'read recipe' to start the directions.";
                recipeExists = true;
                break;
            }
        }
        if (!recipeExists) {
            this.attributes.speechOutput = "Could not find a recipe by that name.";
        }
        this.emit(':ask', this.attributes.speechOutput);

    },
    'IngredientsIntent': function () {
        if (this.attributes.ingredients === undefined) {
            this.emit(':ask', "Please pick a recipe.");
        } else {
            this.handler.state = states.INGREDIENTS;
            this.emitWithState("IngredientsIntent");
        }
    },
    'DirectionsIntent': function () {
        if (this.attributes.directions === undefined) {
            this.emit(':ask', "Please pick a recipe.");
        } else {
            this.handler.state = states.DIRECTIONS;
            this.emitWithState("DirectionsIntent");
        }
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = "You can search for a recipe by saying, 'Find,' then your recipe name.\
        For example, 'Find pork chops'. Similar commands include: How do I cook coconut milk corned beef and cabbage?\
        How do I make homemade cookies? I would like to prepare carrot cake oatmeal. Search for Shepherd's Pie.\
        You can also use the commands 'exit' and 'quit' to leave the app.";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', "Goodbye!");
    },
    'SessionEndedRequest': function () {
        this.emitWithState('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput);
    },
});

var ingredientsHandlers = Alexa.CreateStateHandler(states.INGREDIENTS, {
    'PrevIntent': function () {
        if (this.attributes.index === 0) {
        } else {
            this.attributes.index--;
            this.attributes.speechOutput = this.attributes.ingredients[this.attributes.index];
        }
        this.emit(':ask', this.attributes.speechOutput);
    },
    'NextIntent': function () {
        if (this.attributes.index === this.attributes.ingredients.length - 1) {
            this.emitWithState("DirectionsIntent");
        } else {
            this.attributes.index++;
            this.attributes.speechOutput = this.attributes.ingredients[this.attributes.index];
            this.emit(':ask', this.attributes.speechOutput);
        }
    },
    'IngredientsIntent': function () {
        this.attributes.index = 0;
        this.attributes.speechOutput = "First ingredient: " + this.attributes.ingredients[this.attributes.index];
        this.emit(':ask', this.attributes.speechOutput);
    },
    'DirectionsIntent': function () {
        this.handler.state = states.DIRECTIONS;
        this.emitWithState("DirectionsIntent");
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = "You can navigate the ingredients list by saying: \
            Previous ingredient. Next ingredient. Start again. Main menu. Exit. Quit.";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StartOverIntent': function () {
        this.emitWithState("IngredientsIntent");
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = states.MAIN;
        this.attributes.speechOutput = "Recipe assistant, what recipe would you like to make?";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'SessionEndedRequest': function () {
        this.emitWithState('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput);
    },
});

var directionsHandlers = Alexa.CreateStateHandler(states.DIRECTIONS, {
    'PrevIntent': function () {
        if (this.attributes.index === 0) {
        } else {
            this.attributes.index--;
            this.attributes.speechOutput = this.attributes.directions[this.attributes.index];
        }
        this.emit(':ask', this.attributes.speechOutput);
    },
    'NextIntent': function () {
        if (this.attributes.index === this.attributes.directions.length - 1) {
            this.emitWithState("AMAZON.StopIntent");
        } else {
            this.attributes.index++;
            this.attributes.speechOutput = this.attributes.directions[this.attributes.index];
            this.emit(':ask', this.attributes.speechOutput);
        }
    },
    'IngredientsIntent': function () {
        this.handler.state = states.INGREDIENTS;
        this.emitWithState('IngredientsIntent');
    },
    'DirectionsIntent': function () {
        this.attributes.index = 0;
        this.attributes.speechOutput = "First Step: " + this.attributes.directions[this.attributes.index];
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = "You can navigate the preparation directions by saying: \
            Previous step. Next step. Start again. Main menu. Exit. Quit.";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StartOverIntent': function () {
        this.emitWithState('DirectionsIntent');
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = states.MAIN;
        this.attributes.speechOutput = "Recipe completed! Enjoy your meal. Ask for another recipe if still hungry.";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'SessionEndedRequest': function () {
        this.emitWithState('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput);
    },
});