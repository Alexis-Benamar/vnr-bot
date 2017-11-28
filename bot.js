/*
 * TODO LIST
 * - Add 'this is how I work' reply when not tweeted correctly
 * - Split bot.js in other files
 */

console.log('\nhenlo\n');

/* Initialize everything */
// Keys are stored as variable environnements.
// Check config-dummy.js to see what keys are needed.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
    console.log("// DEV //\n");
} else {
    console.log("// PROD //\n");
}
var request = require('request');
var Twit = require('twit');
var config = {
    consumer_key:         process.env.consumer_key,
    consumer_secret:      process.env.consumer_secret,
    access_token:         process.env.access_token,
    access_token_secret:  process.env.access_token_secret
};
var fs = require('fs');     // File system on
var T = new Twit(config);   // Initializing twitter bot
var requests = [];          // Initializing request pool

// Listened streams
var stream = T.stream('user');
var negan_bot_stream = T.stream('statuses/filter', { follow: ['918196580443918336']});

// Start twitter streams
stream.on('tweet', mentioned);
negan_bot_stream.on('tweet', neganTweeted);


/* React to a tweet mentioning @vnrbot by adding a request to the request queue */
function mentioned(eventMsg) {
    // React only if tweet is sent by someone else than vnrbot
    if (!(eventMsg.user.screen_name === 'vnrbot')) {
        if (!(eventMsg.is_quote_status)) {
            // Confirm that the tweets has a 'vnrbot' mention
            // and is the first mention of the tweet
            if (eventMsg.entities.hasOwnProperty('user_mentions') && eventMsg.entities.user_mentions.length > 0 && eventMsg.entities.user_mentions[0].screen_name === 'vnrbot') {
                // Look at the first word that is not a mention -> "@vnrbot !test" would get '!test' selected
                var triggerString = eventMsg.text.split(" ");
                switch(triggerString[1]){
                    case '!ne':
                        // New Episode trigger
                        console.log('+ New EPISODE by: ' + eventMsg.user.screen_name);
                        randomEp(eventMsg);
                        break;
                    case '!help':
                        helpTweet(eventMsg);
                        break;
                    case '#vnrthis':
                        // New request trigger
                        // If there is hashtags && If there's at least 1 hashtag && If the 1st hashtag = #vnrthis
                        if (eventMsg.entities.hasOwnProperty('hashtags') && eventMsg.entities.hashtags.length > 0 && eventMsg.entities.hashtags[0].text === 'vnrthis') {
                            console.log('+ New REQUEST by: ' + eventMsg.user.screen_name + '\n+ "' + eventMsg.text + '"\n');
                            requests.push({
                                'id': eventMsg.timestamp_ms,
                                'from': eventMsg.user.screen_name,
                                'tweet_id': eventMsg.id_str,
                                'tweet_text': eventMsg.text
                            });
                        }
                        break;
                    default:
                        console.log("+ Default Reply");
                        defaultReply(eventMsg);
                        break;
                }
            }
        } else {
            // Fav the tweet that quoted it
            if (eventMsg.quoted_status.user.screen_name === "vnrbot") {
                T.post("favorites/create", {id: eventMsg.id_str}, function(err, data, response) {
                    if (err) {
                        console.log("+ Error when faving: \n", err);
                    } else {
                        console.log("+ Favorited successfully: " + eventMsg.text + "\n");
                    }
                });
            }
        }
    }
}

/* MAIN LOOP - Handle 1 requests every 10 seconds */
setInterval( function () {
    if (requests.length > 0) {
        // Get first request from requests pool
        req = requests[0];
        console.log("+ HANDLING REQUEST " + req.id + "\n" +
                    "+ From: " + req.from + "\n" +
                    "+ Text: \""+ req.tweet_text + "\"");
        // Remove handled request
        requests.splice(requests.indexOf(req), 1);
        var reply_tweet = {
            'in_reply_to_status_id': req.tweet_id,
            'status': '@'+ req.from + ' henlo'
        }

        tweetIt(reply_tweet);
    }
}, 10000 );

/* Default reply when none other triggers are activated */
function defaultReply(eventMsg) {
    var tweet = {};
    var params = {
        encoding: 'base64'
    };
    var b64_image = fs.readFileSync('auto-images/rip.jpg', params);
    T.post('media/upload', { media_data: b64_image }, function (err, data, response){
        tweet.media_ids = new Array(data.media_id_string);
        tweet.in_reply_to_status_id = eventMsg.id_str;
        tweet.status = "@" + eventMsg.user.screen_name + " j'ai pas compris dsl";
        tweetIt(tweet);
    });
}

/* Help tweet with all commands */
function helpTweet(eventMsg) {
    var tweet = {
        'in_reply_to_status_id': eventMsg.id_str,
        'status':   '@' + eventMsg.user.screen_name + ' This is how I work: \n' +
                    'Tweet me an image with the #vnrthis hashtag just after the @ and I will (in a near future) make your image angrier.\n' +
                    '\nRight now, I mostly reply \'henlo\' to everyone'
    };
    tweetIt(tweet);
}

/* Favorites every tweet from @IamNeggan */
function neganTweeted(eventMsg) {
    console.log("+ IamNeggan tweeted: ", eventMsg.text);
    T.post("favorites/create", {id: eventMsg.id_str}, function(err, data, response) {
        if (err) {
            console.log("+ Error when faving: \n", err);
        } else {
            console.log("+ Favorited successfully");
        }
    });
}

/* Uploads a new tweet. */
function tweetIt(tweet) {
    T.post('statuses/update', tweet, tweeted);
    function tweeted(err, data, response) {
        if (err) {
            console.log('/!\\ Error when tweeting.\n' + err);
            return false;
        } else {
            console.log("+------------------------+\n" +
                        "| REPLIED: " + data.text + "\n" +
                        "+------------------------+\n");
            return true;
        }
    };
}

/* Saves last recieved tweet in a json file */
function saveTweet(eventMsg) {
    var json_tweet = JSON.stringify(eventMsg, null, 2);
    fs.writeFile('tweet.json', json_tweet, function(err) {
        if (err) {
            console.log("- Error when writing json file: \n", err);
        } else {
            console.log("- Saved tweet successfully\n");
        }
    });
}

/* Pick random show to watch (rdm Season & rdm Episode) */
function randomEp(eventMsg) {
    fs.readFile('series.json', function (err, data) {
        if (err) throw err;
        else {
            // Get series data from readfile response
            var seriesList = JSON.parse(data);
            var rdmShow = seriesList.series[Math.floor(Math.random() * seriesList.series.length)];
            var rdmSeason = Math.floor(Math.random() * rdmShow.seasons.length) + 1;
            var rdmEpisode = Math.floor(Math.random() * rdmShow.seasons[rdmSeason-1]) + 1;
            var tweet = {
                'in_reply_to_status_id': eventMsg.id_str,
                'status':   '@' + eventMsg.user.screen_name + '\n' +
                            '\nShow: ' + rdmShow.name +
                            '\nSeason ' + rdmSeason +
                            '\nEpisode ' + rdmEpisode + '\n'
            };

            tweetIt(tweet);
        }
    });
}
