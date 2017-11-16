/*
 * TODO LIST
 * - Add 'this is how I work' reply when not tweeted correctly
 * - Clean code by merging 3 ifs in 1 with &&
 */

// henlo
console.log('\nhenlo\n');

var request = require('request');
var Twit = require('twit');

// Keys are stored as variable environnements.
// Check config-dummy.js to see what keys are needed.
//var config = require('./config');
// Prod or not prod
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
    console.log("// DEV //\n");
} else {
    console.log("// PROD //\n");
}

var config = {
    consumer_key:         process.env.consumer_key,
    consumer_secret:      process.env.consumer_secret,
    access_token:         process.env.access_token,
    access_token_secret:  process.env.access_token_secret
};

// File system on
var fs = require('fs');
// fs.readdir('images', function(err){
//     if(err) {
//         console.log(err);
//         fs.mkdir('/images');
//     }
// });

// Initializing twitter bot
var T = new Twit(config);

// Listened streams
var stream = T.stream('user');
var negan_bot_stream = T.stream('statuses/filter', { follow: ['918196580443918336']});

// RequestsPool
var requests = [];

// Start twitter streams
stream.on('tweet', mentioned);
negan_bot_stream.on('tweet', neganTweeted);


/*
 * React to a tweet mentioning @vnrbot
 * Add a request to the request queue
 */
function mentioned(eventMsg)
{
    // React only if tweet is sent by someone else than vnrbot
    if (!(eventMsg.user.screen_name === 'vnrbot'))
    {
        if(!(eventMsg.is_quote_status)){
            // Confirm that the tweets has a 'vnrbot' mention
            // and is the first mention of the tweet
            if (eventMsg.entities.hasOwnProperty('user_mentions')) {
                if (eventMsg.entities.user_mentions.length > 0) {
                    if (eventMsg.entities.user_mentions[0].screen_name === 'vnrbot')
                    {
                        // Look at the first word that is not a mention
                        // "@vnrbot !test" would get '!test' selected
                        var triggerString = eventMsg.text.split(" ");
                        switch(triggerString[1]){

                            // New Episode trigger
                            case '!ne':
                                console.log('+ New EPISODE by ', eventMsg.user.screen_name);
                                randomEp(eventMsg);
                                break;

                            // New request trigger
                            case '#vnrthis':
                                if(eventMsg.entities.hasOwnProperty('hashtags')){               // If there is hashtags
                                    if(eventMsg.entities.hashtags.length > 0){                  // If there's at least 1 hashtag
                                        if(eventMsg.entities.hashtags[0].text === 'vnrthis')    // If the 1st hashtag = #vnrthis
                                        {
                                            console.log('+ New REQUEST by: ' + eventMsg.user.screen_name +
                                                        '\n"'+eventMsg.text+'"\n');

                                            requests.push({
                                                'id': eventMsg.timestamp_ms,
                                                'from': eventMsg.user.screen_name,
                                                'tweet_id': eventMsg.id_str,
                                                'tweet_text': eventMsg.text
                                            });
                                        }
                                    }
                                }
                                break;

                            default:
                                console.log("+ Default Reply");
                                defaultReply(eventMsg);
                                break;
                        }
                    }
                }
            }
        } else {
            // Fav the tweet that quoted it
            if(eventMsg.quoted_status.user.screen_name === "vnrbot")
            {
                T.post("favorites/create", {id: eventMsg.id_str}, function(err, data, response) {
                    if (err) {
                        console.log("+ Error when faving: \n", err);
                    } else {
                        console.log("+ Favorited successfully");
                    }
                });
            }
        }
    }
}

/*
 * Default reply when none other triggers are activated
 */
function defaultReply(eventMsg)
{
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

/*
 * Favorites every tweet from @IamNeggan
 */
function neganTweeted(eventMsg)
{
    console.log("+ IamNeggan tweeted: ", eventMsg.text);

    T.post("favorites/create", {id: eventMsg.id_str}, function(err, data, response) {
        if (err) {
            console.log("+ Error when faving: \n", err);
        } else {
            console.log("+ Favorited successfully");
        }
    });
}


/*
 * Uploads a new tweet.
 */
function tweetIt(tweet)
{
    T.post('statuses/update', tweet, tweeted);

    function tweeted(err, data, response){
        if (err) {
            console.log('/!\\ Error when tweeting.\n'
                        + err);

            return false;
        } else {
            console.log("+------------------------------+\n" +
                        "| REPLIED: " + data.text + "\n" +
                        "+------------------------------+\n");

            return true;
        }
    };
}


/*
 * Saves last recieved tweet in a json file
 */
function saveTweet(eventMsg)
{
    var json_tweet = JSON.stringify(eventMsg, null, 2);
    fs.writeFile('tweet.json', json_tweet, function(err) {
        if(err) {
            console.log("- Error when writing json file: \n", err);
        } else {
            console.log("- Saved tweet successfully\n");
        }
    });
}


/*
 * MAIN LOOP
 * Handle 1 requests every 10 seconds
 */
setInterval(function ()
{
    if (requests.length > 0)
    {
        handleRequest(requests);
    }
}, 10000);


/*
 * Request handler
 * Currently just reply "henlo" to the tweet
 */
function handleRequest(requests)
{
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


/*
 * Pick random show to watch (rdm Season & rdm Episode)
 */
function randomEp(eventMsg)
{
    var seriesList;
    fs.readFile('series.json', function (err, data) {
        if(err) throw err;
        else
        {
            // Get series data from readfile response
            var seriesList = JSON.parse(data);

            // select rdm episode
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


/*
 * OLD MENTIONED FUNCTION
 *
function mentioned(eventMsg) {

    if(!(eventMsg.user.screen_name === 'vnrbot')){

        var replyTo = eventMsg.in_reply_to_screen_name;
        var id = eventMsg.id_str;
        var text = eventMsg.text.replace('@vnrbot ', '');
        var from = eventMsg.user.screen_name;
        var from_name = eventMsg.user.name;

        var tweet = {}; // initializing response tweet

        if(eventMsg.entities.hasOwnProperty("user_mentions")){                  // check if there are mentions inside the tweet
            if(eventMsg.entities.user_mentions[0].screen_name === 'vnrbot'){    // If the first mention = @vnrbot
                console.log('MENTIONNED by: ' + eventMsg.user.screen_name);
                console.log('Tweet: ' + eventMsg.text);
                if(eventMsg.entities.hasOwnProperty('hashtags')){               // If there is hashtags
                    if(eventMsg.entities.hashtags.length > 0){                  // If there's at least 1 hashtag
                        if(eventMsg.entities.hashtags[0].text === 'vnrthis'){   // If the 1st hashtag = #vnrthis
                            console.log('-> vnrthis');

                            if(eventMsg.hasOwnProperty('extended_entities')){
                                if(eventMsg.extended_entities.media.length > 0){
                                    console.log('media type: ' + eventMsg.extended_entities.media[0].type);
                                    json_tweet = JSON.stringify(eventMsg, null, 2);
                                    // fs.writeFile('tweet.json', json_tweet);

                                    if(!(eventMsg.extended_entities.media[0].type === "photo")){
                                        var params = {
                                            encoding: 'base64'
                                        }
                                        var b64_image = fs.readFileSync('auto-images/rip.jpg', params);
                                        T.post('media/upload', { media_data: b64_image }, function (err, data, response){
                                            tweet.media_ids = new Array(data.media_id_string);
                                            tweet.in_reply_to_status_id = id;
                                            tweet.status = '@' + from + ' sry, no gifs / videos allowed';
                                            tweetIt(tweet);
                                        });
                                    } else {
                                        request.get(eventMsg.extended_entities.media[0].media_url, function(error, response, body){
                                            if(error){
                                                console.log(error);
                                            } else {
                                                console.log('statusCode: ' + response.statusCode);
                                                console.log('Content-Type: ' + response.headers['content-type']);
                                            }
                                        });
                                        //.pipe(fs.createWriteStream('auto-images/' + eventMsg.extended_entities.media[0].id_str + '-' + id + '.png'));
                                        tweet.in_reply_to_status_id = id;
                                        tweet.status = '@' + from + ' soon';
                                        tweetIt(tweet);
                                    }
                                }
                            }

                        }
                    } else {
                        // Default reply
                        tweet.in_reply_to_status_id = id;
                        tweet.status = '@' + from + ' bonsoir ' + from.replace('@', '');
                        tweetIt(tweet);
                    }
                }
            }
        }
    }
};*/
