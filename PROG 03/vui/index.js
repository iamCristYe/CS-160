'use strict';

console.log('Loading function');

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

var Alexa = require('alexa-sdk');

var APP_ID = "";

var states = {
    MAIN: '_MAIN'
    INGREDIENTS: '_INGREDIENTS'
    DIRECTIONS: '_DIRECTIONS'
};


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
        var alexa = Alexa.handler(event, context);
        alexa.APP_ID = APP_ID;
        alexa.registerHandlers(mainHandlers, ingredientsHandler, directionsHandler);
        alexa.execute();
    }
    
};

var mainHandlers = Alexa.CreateStateHandler(states.MAIN, {
    'LaunchRequest': function () {
        this.handler.state = states.MAIN;
        dynamo.scan({
                TableName : "RecipesList"
            }, function(err, data) {
                if (err) {
                    console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    // print all the movies
                    console.log("Scan succeeded.");
                    this.attributes.tableData = data.Items;
                }
            });
        this.attributes.speechOutput = "Recipe assistant, what recipe would you like to make?";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'SearchIntent': function () {
        var param = intent.slots.Recipe.value;
        Boolean recipeExists = false;
        for (var i in this.attributes.tableData) {
            var name = Items[i]['RecipeName'].toLowerCase();
            if (name === param) {
                this.attributes.ingredients = Items[i]['IngredientsList'].split("\\");
                this.attributes.directions = Items[i]['PrepDirections'].split("\\");
                this.attributes.speechOutput = "Found one recipe for " + name + ". Say 'what are the ingredients' for the list of ingredients or 'read recipe' to start the directions.";
                recipeExists = true;
            }
        }
        if (recipeExists === false) {
            this.speechOutput = "Could not find a recipe by that name.";
        }
        this.emit(':ask', this.attributes.speechOutput);

    },
    'IngredientsIntent': function () {
        if (this.attributes.ingredients == null) {
            this.emit(':ask', "Please pick a recipe.");
        } else {
            this.handler.state = states.INGREDIENTS;
            this.emit("IngredientsIntent");
        }
    },
    'DirectionsIntent': function () {
        if (this.attributes.directions == null) {
            this.emit(':ask', "Please pick a recipe.");
        } else {
            this.handler.state = states.DIRECTIONS;
            this.emit("DirectionsIntent");
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
        this.emit('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput);
    },
});

var ingredientsHandler = Alexa.CreateStateHandler(states.INGREDIENTS, {
    'PrevIntent': function () {
        try {
            this.attributes.index--;
            this.attributes.speechOutput = this.attributes.ingredients[this.attributes.index];
            this.emit(':ask', this.attributes.speechOutput);
        } catch {
            this.emit(':ask', this.attributes.speechOutput);
        }
    },
    'NextIntent': function () {
        try {
            this.attributes.index++;
            this.attributes.speechOutput = this.attributes.ingredients[this.attributes.index];
            this.emit(':ask', this.attributes.speechOutput);
        } catch {
            this.emit("DirectionsIntent");
        }
    },
    'IngredientsIntent': function () {
        this.attributes.index = 0;
        this.attributes.speechOutput = "First ingredient: " + this.attributes.ingredients[this.attributes.index];
        this.emit(':ask', this.attributes.speechOutput);
    },
    'DirectionsIntent': function () {
        this.handler.state = states.DIRECTIONS;
        this.emit("DirectionsIntent");
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = "You can navigate the ingredients list by saying: \
            Previous ingredient. Next ingredient. Start again. Main menu. Exit. Quit.";
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StartOverIntent': function () {
        this.emit("IngredientsIntent");
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = states.MAIN;
        this.emit("LaunchRequest");
    },
    'SessionEndedRequest': function () {
        this.emit('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput);
    },
});

var directionsHandler = Alexa.CreateStateHandler(states.DIRECTIONS, {
    'PrevIntent': function () {
        try {
            this.attributes.index--;
            this.attributes.speechOutput = this.attributes.directions[this.attributes.index];
            this.emit(':ask', this.attributes.speechOutput);
        } catch {
            this.emit(':ask', this.attributes.speechOutput);
        }
    },
    'NextIntent': function () {
        try {
           this.attributes.index++;
            this.attributes.speechOutput = this.attributes.directions[this.attributes.index];
            this.emit(':ask', this.attributes.speechOutput); 
        } catch {
            this.emit('AMAZON.StopIntent');
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
        this.emit('DirectionsIntent');
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput);
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = states.MAIN;
        this.emitWithState('LaunchRequest');
    },
    'SessionEndedRequest': function () {
        this.emit('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput);
    },
});
