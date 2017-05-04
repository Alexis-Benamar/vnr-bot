console.log('henlo');

var Twit = require('twit');
// keys are stored as variable environnements.
// check config-dummy.js to see what keys are needed.
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

function mentioned(eventMsg) {
    var replyTo = eventMsg.in_reply_to_screen_name;
    var id = eventMsg.id_str;
    var text = eventMsg.text.replace('@vnrbot ', '');
    var from = eventMsg.user.screen_name;
    var from_name = eventMsg.user.name;

    var tweet = {};

    if(replyTo === 'vnrbot'){
        tweet.in_reply_to_status_id = id;

        switch (text) {
            case 'poste une image stp':

                tweet.status = "ça c'est moi en vrai";

                console.log('opening image...');
                var image_path = './img-test.jpg';
                var b64content = fs.readFileSync(image_path, { encoding: 'base64' });

                console.log('uploading image...');
                T.post('media/upload', { media_data: b64content }, uploaded);

                function uploaded(err, data, response) {
                    if(err){
                        console.log('ERROR:');
                        console.log(err);
                    } else {
                        console.log('image uploaded');
                        console.log('tweeting image...');
                        tweet.media_ids = new Array(data.media_id_string);
                        tweetIt(tweet);
                    }
                }
                break;
            case 'tractopelle':
                tweet.status = '@' + from + " replying to " + from_name + "'s tractopelle";
                tweetIt(tweet);
                break;
            default:
                tweet.status = '@' + from + ' bonsoir ' + from_name;
                tweetIt(tweet);
                break;
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
            console.log('new tweet: ' + data.text);
        }
    };
}
