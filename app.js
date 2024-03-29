const restify = require('restify');
const builder = require('botbuilder');
require('dotenv-extended').load();

const commands = require('./app/recognizers/commands');

//require dialogs
const dialog = {
    greet: require('./app/dialogs/greet'),
    contactHuman: require('./app/dialogs/contactHuman'),
    locationAvailability: require('./app/dialogs/locationAvailability'),
    trackOrder: require('./app/dialogs/trackOrder'),
    sizeAndPriceGuide: require('./app/dialogs/sizeAndPriceGuide'),
    sendPost: require('./app/dialogs/sendPost'),
    convertCurrency: require('./app/dialogs/convertCurrency'),
    thankBack: require('./app/dialogs/thankBack'),
    bye: require('./app/dialogs/bye'),
    showServices: require('./app/dialogs/showServices'),
    rateTimeQuote: require('./app/dialogs/rateTimeQuote'),
    platformFix: require('./app/dialogs/platformFix')   

};

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

const bot = new builder.UniversalBot(connector, {
    persistConversationData: true
});

// var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/67f56d58-9a3e-49bc-83c6-7132fc485096?subscription-key=7928eebc0f3d43e58de298827a21b73f&timezoneOffset=0&verbose=true';

var intents = new builder.IntentDialog({
    recognizers: [
        commands,
        new builder.LuisRecognizer(process.env.LUIS_MODEL_URL)
    ],
    intentThreshold: 0.2,
    recognizeOrder: builder.RecognizeOrder.series
});


intents.matches('greet', '/greet')
intents.matches('contactHuman', '/contactHuman')
intents.matches('trackOrder', '/trackOrder')
intents.matches('locationAvailability', '/locationAvailability')
intents.matches('sizeAndPriceGuide', '/sizeAndPriceGuide')
intents.matches('sendPost', '/sendPost')
intents.matches('convertCurrency', '/convertCurrency')
intents.matches('thankBack', '/thankBack')
intents.matches('bye', '/bye')
intents.matches('showServices', '/showServices')
intents.matches('rateTimeQuote', '/rateTimeQuote')
intents.matches('platformFix', '/platformFix')
intents.onDefault('/confused')

bot.dialog('/', intents);
dialog.greet(bot);
dialog.contactHuman(bot);
dialog.trackOrder(bot);
dialog.locationAvailability(bot, builder);
dialog.sizeAndPriceGuide(bot);
dialog.sendPost(bot);
dialog.convertCurrency(bot);
dialog.thankBack(bot);
dialog.bye(bot);
dialog.showServices(bot);
dialog.rateTimeQuote(bot);
dialog.platformFix(bot);

bot.dialog('/confused', [
    function (session, args, next) {
        if (session.message.text.trim()) {
            session.endDialog('Sorry, I didn\'t understand you or maybe just lost track of our conversation');
        } else {
            session.endDialog();
        }        
    }
]);

// Setup Restify Server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

//get request for webchat
server.get(/.*/, restify.plugins.serveStatic({
    'directory': '.',
    'default': 'index.html'
}));
                                                                                                                                                                                                                        