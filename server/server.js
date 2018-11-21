const MongoClient = require('mongodb').MongoClient;
const tokensConfig = require('./tokensConfig.json');
let uniqueID = 0;
const loggedInUser = {
    ip: null,
    socket: null,
    loggedIn: false,
};
const collectionArray = [];

const url = tokensConfig.mongoDB.url.replace("<PASSWORD>", tokensConfig.mongoDB.password);

const dbName = tokensConfig.mongoDB.name;

let connectedDB;

MongoClient.connect(url, function(err, client) {
    if(err) {
        console.log('Error occurred while connecting to MongoDB Atlas...\n',err);
    }
    console.log("Connected successfully to db");

    connectedDB = client.db(dbName);

    insertDocuments(connectedDB, function() {

    });

    getLastID(connectedDB);
    getAllDocuments(connectedDB);
});

function insertDocuments(db, callback) {
    const collection = db.collection('documents');

    collection.insertOne({_id:'Question&Answers'}).catch();
};

function updateDocuments(db, obj, name, callback) {
    const collection = db.collection('documents');
    collection.update({_id:'Question&Answers'},{$set:{[name]:obj}},{upsert:true}).catch()
};

function getLastID(db){
    const collection = db.collection('documents');
    const idArray=[];
    collection.findOne({}, function(err, result) {
        if(err){
            console.log(err);
        }
        for(key in result){
            if(key !== "_id"){
                idArray.push(result[key]);
            }
        }
        if(idArray.length > 0){
            idArray.sort(function(a, b){
                return b.id - a.id;
            });
            uniqueID = parseInt(idArray[0].id) + 1;
        }
    });
}

function getAllDocuments(db){
    collectionArray.length = 0;
    const collection = db.collection('documents');

    collection.findOne({}, function(err, result) {
        if(err){
            console.log(err);
        }
        for(key in result){
            if(key !== "_id"){
                collectionArray.push(result[key]);
            }
        }
        console.log("updated collectionArray");
    });
}

const WebSocket = require('ws');
const PORT = process.env.PORT || 9090;
const wss = new WebSocket.Server({
    port: PORT
});

const LOGIN=0;
const SENDQUESTION=1;
const SENDANSWER=2;
const REQUESTQUESTIONS=3
const REQUESTANSWERS=4

console.log("server started on port", PORT);

wss.on('connection', function connection(ws, req) {
    console.log("someone reached the server");
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const user = {
        ip: ip,
        socket: ws,
        loggedIn:false,
    };

    ws.on('message', function(data) {
        data = data.split(";;;");
        const dataMessage = parseInt(data);
        switch(dataMessage){
            case LOGIN: loginUser(user, data[1]);
            break;
            case SENDQUESTION: 
                saveAndNotify(dataMessage, user, data);
            break;
            case SENDANSWER: 
                saveAndTweet(dataMessage, user, data);
            break;
            case REQUESTQUESTIONS: 
                sendDataToClient(dataMessage, user, data);
            break;
            case REQUESTANSWERS: 
                sendDataToClient(dataMessage, user, data);
            break;
            default: 
                console.log(user, dataMessage, data);
        }
    });
});

function loginUser(user, data){
    if(Buffer.from(data).toString('base64') === tokensConfig.login.password){
        user.loggedIn = true;
        loggedInUser.ip = user.ip;
        loggedInUser.socket = user.socket;
        loggedInUser.loggedIn = user.loggedIn;
        console.log(loggedInUser.ip, "logged in");
        loggedInUser.socket.send(LOGIN+";;;"+JSON.stringify({}));
    }else{
        console.log("wrong password", data);
    }
}

function isLoggedIn(user){
   return (user.ip === loggedInUser.ip && user.socket === loggedInUser.socket && user.loggedIn === loggedInUser.loggedIn)
}

function saveAndTweet(dataMessage, user, data){
    if(!isLoggedIn(user)){
        console.log("no access", user, data);
        return;
    }
    console.log("question answered")
    saveToDatabase(dataMessage, user, data[1]);
    sendDataToTwitter(data[1]);
}

function getNewID(){
    return uniqueID++;
}

function saveAndNotify(dataMessage, user, data){
    const obj = saveToDatabase(dataMessage, user, data[1]);
    notifyOwner(obj);
}

function saveToDatabase(type, user, data){
    const parsedData = JSON.parse(data);
    if(!parsedData.id){
        parsedData.id = getNewID();
    }
    if(parsedData.name.trim() === ""){
        parsedData.name = "Anonymous";
    }
    if(!parsedData.answer){
        parsedData.answer = "null";
    }
    if(!parsedData.dateOfAnswer && type === SENDANSWER){
        parsedData.dateOfAnswer = getDateTime();
    }else{
        parsedData.dateOfAnswer = "null";
    }
    if(!parsedData.dateOfQuestion && type === SENDQUESTION){
        parsedData.dateOfQuestion = getDateTime();
    }
    if(!parsedData.dateOfQuestion && type === SENDANSWER){
        for(let ii = 0; ii < collectionArray.length; ii++){
            if(collectionArray[ii].id === parsedData.id){
                parsedData.dateOfQuestion = collectionArray.dateOfQuestion;
            }
        }
    }

    const obj={
        id: parsedData.id,
        name: parsedData.name,
        question: parsedData.question,
        answer: parsedData.answer,
        dateOfQuestion: parsedData.dateOfQuestion,
        dateOfAnswer: parsedData.dateOfAnswer,
    };
    
    updateDocuments(connectedDB, obj, obj.id);
    setTimeout(()=>{
        getAllDocuments(connectedDB);
    }, 5000)

    return obj;
}

function sendDataToClient(type, user){
    let data = [];
    if(type === REQUESTANSWERS){
        data = getAnswers();
    }else if(type === REQUESTQUESTIONS){
        data = getQuestions();
    }else{
        console.log("type not found", type)
    }
    
    user.socket.send(type+";;;"+JSON.stringify(data));
}

function getAnswers(){
    const array = collectionArray;
    const answerArray = [];
    const arrayLength = array.length;
    for(let ii = 0; ii < arrayLength; ii++){
        if(array[ii].answer !== "null"){
            answerArray.push(array[ii]);
        }
    }

    answerArray.sort(function(a, b){
        return b.id - a.id;
    });

    return answerArray;
}

function getQuestions(){
    const array = collectionArray;
    const questionArray = [];
    const arrayLength = array.length;
    for(let ii = 0; ii < arrayLength; ii++){
        if(array[ii].answer === "null"){
            questionArray.push(array[ii]);
        }
    }

    questionArray.sort(function(a, b){
        return b.id - a.id;
    });

    return questionArray;
}

function getDateTime() {
    const date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    let year = date.getFullYear();

    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    let day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

const Twitter = require('twitter');

const twitter = new Twitter(tokensConfig.twitter);

const twitterQueue = [];

function sendDataToTwitter(unparsedData){
    const data = JSON.parse(unparsedData);
    const toSend = data.name + ": " + data.question + " -> " + data.answer;
    twitterQueue.unshift(toSend);
}

setInterval(()=>{ 
    if(twitterQueue.length > 0){
        const toSend = twitterQueue.pop();
        twitter.post('statuses/update', {status: toSend},  function(error, tweet, response){
            if(error){
              console.log(error);
            }
            console.log("tweet send");
        });
    }else{
        console.log("nothing to tweet")
    }
}, 60000);

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Discord bot Logged in as ${client.user.tag}!`);
});

client.login(tokensConfig.discord.token);

function notifyOwner(data){
    const toSend = data.id+"->"+data.name + ": " + data.question;
    client.users.get(tokensConfig.discord.id).send(toSend);
}