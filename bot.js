console.log('henlo');

var request = require('request');
var Twit = require('twit');
// keys are stored as variable environnements.
// check config-dummy.js to see what keys are needed.
var config = require('./config');
// var config = {
//     consumer_key:         process.env.consumer_key,
//     consumer_secret:      process.env.consumer_secret,
//     access_token:         process.env.access_token,
//     access_token_secret:  process.env.access_token_secret
// };
var fs = require('fs');
var T = new Twit(config);

var stream = T.stream('user');
stream.on('tweet', mentioned);

var vnrbot_stream = T.stream('statuses/filter', { track: 'vnrbot'});
vnrbot_stream.on('tweet', called);

// regex to use later -> [a-zA-ZÀ-ÿ0-9 .!,;:|\[\(\{\}#~&)\]\\/@_\-=+'"?]*ananas\b[ \-.?!]*$

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
                                    fs.writeFile('tweet.json', json_tweet);

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
                                        }).pipe(fs.createWriteStream('images/' + eventMsg.extended_entities.media[0].id_str + '-' + id + '.png'));
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
                console.log('-----------------------');
            }
        }
    }
};


function called(eventMsg) {

    if(!(eventMsg.user.screen_name === 'vnrbot')) {

        var replyTo = eventMsg.in_reply_to_screen_name;
        var id = eventMsg.id_str;
        var text = eventMsg.text.replace('@vnrbot ', '');
        var from = eventMsg.user.screen_name;
        var from_name = eventMsg.user.name;

        var tweet = {};

        if(eventMsg.entities.hasOwnProperty('user_mentions')) {
            if(eventMsg.entities.user_mentions.length > 0) {
                if(!(eventMsg.entities.user_mentions[0].screen_name === "vnrbot")){
                    tweet.in_reply_to_status_id = id;
                    tweet.status = '@' + from + ' henlo';
                    tweetIt(tweet);
                }
            } else {
                tweet.in_reply_to_status_id = id;
                tweet.status = '@' + from + ' henlo';
                tweetIt(tweet);
            }
        }
    }

}

function tweetIt(tweet) {

    T.post('statuses/update', tweet, tweeted);

    function tweeted(err, data, response) {
        if (err) {
            console.log('Something went wrong');
            console.log(err);
        } else {
            console.log('NEW TWEET: ' + data.text);
        }
    };

}
