const Discord = require('discord.js');
const tokens = require('./tokens.json');
const fs = require('fs');
const bot = new Discord.Client();
const MongoClient = require('mongodb').MongoClient;

let collectionObj = {};

const url = tokens.mongoDB.url.replace("<PASSWORD>", tokens.mongoDB.password);

const dbName = tokens.mongoDB.name;

let connectedDB;

MongoClient.connect(url, function(err, client) {
    if(err) {
        console.log('Error occurred while connecting to MongoDB Atlas...\n',err);
    }
    console.log("Connected successfully to db");

    connectedDB = client.db(dbName);

    insertDocuments(connectedDB, function() {

    });

    getAllDocuments(connectedDB);
});

function insertDocuments(db, callback) {
    const collection = db.collection('documents');

    collection.insertOne({_id:'discordMembers'}).catch();
};

function updateDocuments(db, obj, name, callback) {
    const collection = db.collection('documents');
    collection.update({_id:'discordMembers'},{$set:{[name]:obj}},{upsert:true}).catch()
};

function getAllDocuments(db){
    collectionObj = {};
    const collection = db.collection('documents');

    collection.findOne({}, function(err, result) {
        if(err){
            console.log(err);
        }
        for(key in result){
            if(key !== "_id"){
                collectionObj[key] = result[key];
            }
        }
        console.log("updated collectionObj");
    });
}

function getCollectionObj(db){
    getAllDocuments(db);

    return collectionObj;
}

bot.on('ready', () => {
  console.log(`Discord bot Logged in as ${bot.user.tag}!`);
});

bot.on("message", msg => {
    if (msg.author.bot) return;
    
    const points = getCollectionObj(connectedDB);
    console.log("opening:", points);
	
	
	if (!points[msg.author.id]) {
        points[msg.author.id] = newUser();
		console.log("created new user");
    }
    
    const timeOut = 1000 * 60 * 0.5;
	if(timePast(points[msg.author.id].timeOfLastUpdate, timeOut)){
        console.log("updating user");
		addExp(msg.content, points[msg.author.id]);
		levelUp(points[msg.author.id]);
	}
	
    const prefix = "!";
    if (msg.content.toLowerCase().startsWith(prefix + "setDescription".toLowerCase())){
		const string = msg.content.split(" ")[1];
		if(string.length < 100){
			points[msg.author.id].description = string;
			msg.reply("Description set!");
		}else{
			msg.reply("Description not set! description has to be less than 100 characters");
        }
		console.log("set description");
	}
	
    console.log("saving file:", points[msg.author.id]);
    updateDocuments(connectedDB, points[msg.author.id], msg.author.id);
	
	if (!msg.content.startsWith(prefix)) return;
	
	if (msg.content.toLowerCase().startsWith(prefix + "level".toLowerCase())) {
        const embed = new Discord.RichEmbed()
            .setAuthor(msg.author.username + "#" + msg.author.discriminator, msg.author.avatarURL)
            .setColor('#0A599F')
            .setTimestamp()
            .addField('level:', `${points[msg.author.id].level}`, true)
            .addField('experience:', `${points[msg.author.id].exp}`, true)
            .addField('exptotal:', `${points[msg.author.id].exptotal}`, true)
            .addField('attack:', `${points[msg.author.id].attack}`, true)
            .addField('defense:', `${points[msg.author.id].defense}`, true)
			.addField('description:', `${points[msg.author.id].description}`, true)
        msg.channel.send({embed});
		console.log("sent embed!")
        return;
	}
});

bot.login(tokens.discord.token);

function newUser(){
	return {
            exp: 0,
            exptotal: 0,
            level: 1,
            attack: 0,
			defense: 1,
			description: "no description set",
			timeOfLastUpdate: new Date().getTime(),
        };
}

function addExp(msg, user){
	if (msg.length > 200) {
		const exp = calcUserExp(msg.length, 20);
        user.exp += exp;
        user.exptotal += exp
    } else {
        const exp = calcUserExp(msg.length, 5);
        user.exp += exp;
        user.exptotal += exp
    }
}

function levelUp(user){
	const levelup = user.level * 20;
    if (user.exp >= levelup) {
        const exprest = user.exp - levelup;
        user.exp = 0 + exprest;
        user.level++;
		if(rndNumBetween(0, 1)){
			user.defense++;
		}else{
			user.attack++;
		}
    }
}

function timePast(pastTime, timeOut){
	return (new Date().getTime() - pastTime < timeOut)?false:true;
}

function rndNumBetween(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function calcUserExp(length, amount){
	return Math.floor((length / amount));
}

function respond(client){
	const array = [];
    const points = getCollectionObj(connectedDB);
    console.log("reading json:", points);
	bot.guilds.forEach(guild => guild.members.forEach((member) =>{
		let user = points[member.user.id];
		if(!user){
            user = newUser();
            console.log("creating dummy user");
		}
		array.push({
        name: member.user.username,
        image: member.user.avatarURL,
		level: user.level,
		attack: user.attack,
		defense: user.defense,
		description: user.description,
    })
	}));
	sendDataToClient(client, array);
}

const WebSocket = require('ws');
const PORT = process.env.PORT || 6060;
const wss = new WebSocket.Server({
    port: PORT
});

wss.on('connection', function connection(ws, req) {
    console.log("someone reached the server", getDateTime());
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const user = {
        ip: ip,
        socket: ws,
    };

    ws.on('message', function(data) {
        respond(user);
    });
});

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

function sendDataToClient(user, data){
	console.log("sending", data)
    user.socket.send(JSON.stringify(data));
}