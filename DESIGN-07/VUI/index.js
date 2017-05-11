'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');

const Alexa = require('alexa-sdk');

const APP_ID = "amzn1.ask.skill.94fa2af3-3b11-4191-ba96-ad3bb662bef2";

function EntryService() {
    this.dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
}

EntryService.prototype.create = function (userId, itemId, foodName, quantity, expirationDate, cb) {
    var params = {
        TableName: "magicFridge",
        Item: {
            userId: {
                S: userId
            },
            itemId: {
                S: itemId
            },
            foodName: {
                S: foodName
            },
            quantity: {
                N: quantity
            },
            expirationDate: {
                S: expirationDate
            }
        }
    };
    this.dynamodb.putItem(params, cb);
};

EntryService.prototype.update = function (userId, itemId, updatedQuantity, cb) {
    var params = {
        TableName: "magicFridge",
        Key: {
            userId: {
                S: userId
            },
            itemId: {
                S: itemId
            }
        },
        UpdateExpression: "SET #Q = :q",
        ExpressionAttributeNames: {
            "#Q": "quantity"
        },
        ExpressionAttributeValues: {
            ":q": {
                N: updatedQuantity
            }
        }
    };
    this.dynamodb.updateItem(params, cb);
};

EntryService.prototype.read = function (userId, itemId, cb) {
    var params = {
        TableName: "magicFridge",
        Key: {
            userId: {
                S: userId
            },
            itemId: {
                S: itemId
            }
        }
    };
    this.dynamodb.getItem(params, cb);
};

EntryService.prototype.readAll = function (cb) {
    var params = {
        TableName: "magicFridge"
    };
    this.dynamodb.scan(params, cb);
};

EntryService.prototype.delete = function (userId, itemId, cb) {
    var params = {
        TableName: "magicFridge",
        Key: {
            userId: {
                S: userId
            },
            itemId: {
                S: itemId
            }
        }
    };
    this.dynamodb.deleteItem(params, cb);
};

var cb = function (err, data) {
    if (err) {
        console.error("Unable to access the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Action succeeded.");
        console.log(data);
    }
};

var db = new EntryService();

var fridgeData = [];

var fridgeLog = [];

var recipeList = [
    {
        "RecipeName": "Apple Pie",
        "IngredientsList": "Apple\\Pie crust",
        "PrepDirections": "Bake pie\\Eat pie"
    }
];

var userId = "Isaiah";

// var userId = this.event.session.user.userId;

// var iam = new AWS.IAM({apiVersion: '2010-05-08'});

exports.handler = (event, context) => {
    if (fridgeData.length === 0) {
        db.readAll(function (err, data) {
            if (err) {
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Scan succeeded.");
                fridgeData = data.Items;
                var alexa = Alexa.handler(event, context);
                alexa.APP_ID = APP_ID;
                alexa.registerHandlers(handlers);
                alexa.dynamoDBTableName = "FridgeSession";
                alexa.execute();
            }
        });
    } else {
        var alexa = Alexa.handler(event, context);
        alexa.APP_ID = APP_ID;
        alexa.registerHandlers(handlers);
        alexa.dynamoDBTableName = "FridgeSession";
        alexa.execute();
    }
};

var handlers = {
    'LaunchRequest': function () {
        this.attributes.speechOutput = "Welcome to your Magic Fridge! How may I be of assistance?";
        this.attributes.fridgeData = [];
        for (var i in fridgeData) {
            var entry = fridgeData[i];
            if (entry.userId.S === userId) {
                this.attributes.fridgeData.push({
                    "itemId": entry.itemId.S,
                    "foodName": entry.foodName.S,
                    "quantity": +entry.quantity.N,
                    "expirationDate": entry.expirationDate.S
                });
            }
        }
        for (var i in this.attributes.fridgeLog) {
            var item = this.attributes.fridgeLog[i];
            console.log(item.action);
            switch (item.action) {
                case "create":
                    this.attributes.fridgeData.push({
                        "itemId": item.itemId,
                        "foodName": item.foodName,
                        "quantity": +item.quantity,
                        "expirationDate": item.expirationDate
                    });
                    break;
                case "update":
                    for (var j in this.attributes.fridgeData) {
                        var currItem = this.attributes.fridgeData[j];
                        if (item.itemId === currItem.itemId) {
                            this.attributes.fridgeData[j].quantity = item.quantity;
                            break;
                        }
                    }
                    break;
                case "delete":
                    for (var j in this.attributes.fridgeData) {
                        var currItem = this.attributes.fridgeData[j];
                        if (item.itemId === currItem.itemId) {
                            delete this.attributes.fridgeData[j];
                            break;
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        this.attributes.fridgeLog = [];
        this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
    },
    'ExpiryIntent': function () {
        var intentObj = this.event.request.intent;
        if (intentObj.slots.Item.value) {
            var foodNameLc = intentObj.slots.Item.value;
            var foodName = foodNameLc.charAt(0).toUpperCase() + foodNameLc.slice(1);
            var items = [];
            for (var i in this.attributes.fridgeData) {
                var item = this.attributes.fridgeData[i];
                if (item.foodName === foodName) {
                    items.push(item);
                }
            }

            if (items.length === 0) {
                this.attributes.speechOutput = "You don't have " + foodName + " in your fridge.";
            } else {
                var sortedItems = items.sort(function (a, b) {
                    if (a.expirationDate < b.expirationDate) {
                        return -1;
                    }
                    if (a.expirationDate > b.expirationDate) {
                        return 1;
                    }
                    return 0;
                });

                var date = sortedItems[0].expirationDate;
                var quantity = sortedItems[0].quantity;
                if (quantity > 1) {
                    this.attributes.speechOutput = "The next " + quantity + " of your " + foodName + " will expire on " + date;
                } else {
                    this.attributes.speechOutput = "The next " + foodName + " will expire on " + date;
                }
            }
            this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
        } else if (intentObj.slots.Number.value) {
            var daysAway = intentObj.slots.Number.value;
            var day = new Date();
            day.setDate(day.getDate() + daysAway);
            var date = day.getFullYear() + "-" + day.getMonth()+1 + "-" + day.getDay();
            var items = [];
            for (var i in this.attributes.fridgeData) {
                var item = this.attributes.fridgeData[i];
                if (item.expirationDate <= date) {
                    items.push(item.foodName);
                } 
            }
            if (items.length === 0) {
                this.attributes.speechOutput = "You have 0 items that expire by " + date;
            } else {
                this.attributes.speechOutput = "The following items expire by " + date + ": " + items.toString();
            }
            this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
        } else if (intentObj.slots.Date.value) {
            var date = intentObj.slots.Date.value;
            var items = [];
            for (var i in this.attributes.fridgeData) {
                var item = this.attributes.fridgeData[i];
                if (item.expirationDate <= date) {
                    items.push(item.foodName);
                } 
            }
            if (items.length === 0) {
                this.attributes.speechOutput = "You have 0 items that expire by " + date;
            } else {
                this.attributes.speechOutput = "The following items expire by " + date + ": " + items.toString();
            }
            this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
        } else {
            var sortedData = this.attributes.fridgeData.sort(function (a, b) {
                if (a.expirationDate < b.expirationDate) {
                    return -1;
                }
                if (a.expirationDate > b.expirationDate) {
                    return 1;
                }
                return 0;
            });
            var date = sortedData[0].expirationDate;
            var items = [];
            for (var i in sortedData) {
                var item = this.attributes.fridgeData[i];
                if (item.expirationDate === date) {
                    items.push(item.foodName);
                }
            }
            if (items.length === 0) {
                this.attributes.speechOutput = "Your fridge is empty.";
            } else {
                this.attributes.speechOutput = "The following items will expire on " + date + ": " + items.toString();
            }
            this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
        }
    },
    'AddItemIntent': function () {
        if (this.event.request.dialogState !== 'COMPLETED') {
            this.emit(':delegate');
        } else {
            var intentObj = this.event.request.intent;
            var foodNameLc = intentObj.slots.Item.value;
            var foodName = foodNameLc.charAt(0).toUpperCase() + foodNameLc.slice(1);
            var quantity = +intentObj.slots.Quantity.value;
            var expirationDate = intentObj.slots.Date.value;
            var itemId = foodName + expirationDate;
            var i = 0;
            while (i < this.attributes.fridgeData.length) {
                var item = this.attributes.fridgeData[i];
                if (item.itemId === itemId) {
                    var updatedQuantity = item.quantity + quantity;
                    this.attributes.fridgeData[i].quantity = updatedQuantity;
                    this.attributes.fridgeLog.push({
                        "itemId": itemId,
                        "quantity": updatedQuantity,
                        "action": "update"
                    });
                    break;
                }
                i++;
            }

            if (i === this.attributes.fridgeData.length) {
                var newItem = {
                    "userId": userId,
                    "itemId": itemId,
                    "foodName": foodName,
                    "quantity": quantity,
                    "expirationDate": expirationDate,
                    "action": "create"
                };
                this.attributes.fridgeData.push(newItem);
                this.attributes.fridgeLog.push(newItem);
            }
            // db.create(userId, itemId, item, quantity, expirationDate, cb);
            this.attributes.speechOutput = quantity + " " + foodName + " successfully added.";
            this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
        }
    },
    'RemoveItemIntent': function () {
        var intentObj = this.event.request.intent;
        if (this.event.request.dialogState !== 'COMPLETED') {
            this.emit(':delegate');
        } else {
            var foodNameLc = intentObj.slots.Item.value;
            var foodName = foodNameLc.charAt(0).toUpperCase() + foodNameLc.slice(1);
            var removedQuantity = +intentObj.slots.Quantity.value;
            var items = [];
            for (var i in this.attributes.fridgeData) {
                var item = this.attributes.fridgeData[i];
                if (item.foodName === foodName) {
                    items.push(item);
                }
            }

            var sortedItems = items.sort(function (a, b) {
                if (a.expirationDate < b.expirationDate) {
                    return -1;
                }
                if (a.expirationDate > b.expirationDate) {
                    return 1;
                }
                return 0;
            });

            var count = removedQuantity;
            var tempLog = [];
            for (var index in sortedItems) {
                var nextExpiry = sortedItems[index];
                var quantity = nextExpiry.quantity;
                if (count === quantity) {
                    var deletedItem = {
                        "itemId": nextExpiry.itemId,
                        "action": "delete"
                    };
                    tempLog.push(deletedItem);
                    this.attributes.fridgeLog.push(deletedItem);
                    count = 0;
                    break;
                } else if (count < quantity) {
                    var newQuantity = quantity - count;
                    var updatedItem = {
                        "itemId": nextExpiry.itemId,
                        "quantity": newQuantity,
                        "action": "update"
                    };
                    tempLog.push(updatedItem);
                    this.attributes.fridgeLog.push(updatedItem);
                    count = 0;
                    break;
                } else {
                    var deletedItem = {
                        "itemId": nextExpiry.itemId,
                        "action": "delete"
                    };
                    tempLog.push(deletedItem);
                    this.attributes.fridgeLog.push(deletedItem);
                    count -= quantity;
                }
            }

            console.log(tempLog);

            for (var i in tempLog) {
                var change = tempLog[i];
                for (var j in this.attributes.fridgeData) {
                    var item = this.attributes.fridgeData[j];
                    if (change.itemId === item.itemId) {
                        if (change.action === "update") {
                            this.attributes.fridgeData[j].quantity = change.quantity;
                        } else {
                            delete this.attributes.fridgeData[j];
                        }
                        break;
                    }
                }
            }

            if (count !== 0) {
                var actualRemoved = removedQuantity - count;
                this.attributes.speechOutput = actualRemoved + " " + foodName + " successfully removed. You did not have "
                     + removedQuantity + " " + foodName;
            } else {
                this.attributes.speechOutput = removedQuantity + " " + foodName + " successfully removed.";
            }
            this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
        }
    },
    'FindRecipeIntent': function () {
        if (this.event.request.dialogState !== 'COMPLETED') {
            this.emit(':delegate');
        } else {
            var foodNameLc = this.event.request.intent.slots.Item.value;
            var foodName = foodNameLc.charAt(0).toUpperCase() + foodNameLc.slice(1);
            var recipes = [];
            for (var i in recipeList) {
                var recipe = recipeList[i];
                var ingredients = recipe.IngredientsList.split("\\");
                if (ingredients.indexOf(foodName) != -1) {
                    recipes.push(recipe.RecipeName);
                }
            }
            if (recipes.length === 0) {
                this.attributes.speechOutput = "Could not find any recipes containing " + foodName;
            } else {
                this.attributes.speechOutput = "Found the following recipes containing " + foodName +  ": " + recipes.toString();
            }
            this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
        }
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = "To add items to the fridge, say, for example: add apples. \
            To remove items to the fridge, say, for example: remove apples. \
            To find out what expires soon, ask: what expires soon. \
            To find out when something expires, ask, for example: when will the apples expire.\
            To find out what expires by a certain date, ask, for example: What expires by April 20th.\
            To find a recipe containing an item in your fridge, say, for example: Find recipes containing apples.";
        this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
    },
    'AMAZON.StopIntent': function () {
        for (var i in this.attributes.fridgeLog) {
            var item = this.attributes.fridgeLog[i];
            console.log(item.action);
            switch (item.action) {
                case "create":
                    db.create(userId, item.itemId, item.foodName, item.quantity.toString(), item.expirationDate, cb);
                    break;
                case "update":
                    db.update(userId, item.itemId, item.quantity.toString(), cb);
                    break;
                case "delete":
                    db.delete(userId, item.itemId, cb);
                    break;
                default:
                    break;
            }
        }
        this.emit(':tell', "Goodbye!");
    },
    'AMAZON.CancelIntent': function () {
        this.emit('AMAZON.StopIntent');
    },
    'SessionEndedRequest': function () {
        this.emitWithState('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.attributes.speechOutput = "I'm sorry, I can't help you with that.";
        this.emit(':ask', this.attributes.speechOutput, this.attributes.speechOutput);
    },
};
