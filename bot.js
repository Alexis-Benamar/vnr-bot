console.log('henlo');

var Twit = require('twit');
// keys are stored as variable environnements.
// check config-dummy.js to see what keys are needed.
// var config = require('./config');
var config = {
    consumer_key:         process.env.consumer_key,
    consumer_secret:      process.env.consumer_secret,
    access_token:         process.env.access_token,
    access_token_secret:  process.env.access_token_secret
};
var fs = require('fs');
var T = new Twit(config);

var stream = T.stream('user');
stream.on('tweet', mentioned);

// regex to use later -> [a-zA-ZÀ-ÿ0-9 .!,;:|\[\(\{\}#~&)\]\\/@_\-=+'"?]*ananas\b[ \-.?!]*$

function mentioned(eventMsg) {

    if(!(eventMsg.user.screen_name === 'vnrbot')){

        var replyTo = eventMsg.in_reply_to_screen_name;
        var id = eventMsg.id_str;
        var text = eventMsg.text.replace('@vnrbot ', '');
        var from = eventMsg.user.screen_name;
        var from_name = eventMsg.user.name;

        var tweet = {};

        if(eventMsg.entities.hasOwnProperty("user_mentions")){
            if(eventMsg.entities.user_mentions[0].screen_name === 'vnrbot'){
                console.log('MENTIONNED by: ' + eventMsg.user.screen_name);
                console.log('Tweet: ' + eventMsg.text);
                if(eventMsg.entities.hasOwnProperty('hashtags')){
                    if(eventMsg.entities.hashtags.length > 0){
                        if(eventMsg.entities.hashtags[0].text === 'vnrthis'){
                            console.log('-> vnrthis');
                            tweet.in_reply_to_status_id = id;
                            tweet.status = '@' + from + ' soon';
                            tweetIt(tweet);
                        }
                    } else {
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
