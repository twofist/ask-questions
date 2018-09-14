"use strict";
const socket = new WebSocket('wss://ask-questions.herokuapp.com');

const LOGIN=0;
const SENDQUESTION=1;
const SENDANSWER=2;
const REQUESTQUESTIONS=3;
const REQUESTANSWERS=4;

const SPLITTER=";;;";

socket.addEventListener('open', function(event) {
    console.log("connected succesfully");
    socket.send(REQUESTQUESTIONS);
    socket.send(REQUESTANSWERS);
    const userName = document.URL.split("?user=")[1];
    if(userName==="twofist"){
        const password = prompt("Password", "");

        if (password != null) {
            socket.send(LOGIN+SPLITTER+password);
        }
    }
});
socket.addEventListener('close', function(event) {
    console.log("disconnected...");
});
socket.addEventListener('error', function(event) {
    console.log("an error has occured!");
});
socket.addEventListener('message', function(event) {
    const data = event.data.split(SPLITTER);
    const type = parseInt(data[0]);
    const message = JSON.parse(data[1]);
    console.log(type, message)
    switch (type) {
        case LOGIN: loggedIn();
        break;
        case REQUESTQUESTIONS: receiveQuestion(message);
        break;
        case REQUESTANSWERS: receiveAnswer(message);
        break;
        default:
            console.log("Unknown message:", data);
    };
});

function sendAnswer(data){
    socket.send(SENDANSWER +SPLITTER+ JSON.stringify(data));
}

function processAnswer(button){
    const id = button.id.split("=")[1];
    const name = document.getElementById("name="+id).innerHTML;
    const question = document.getElementById("question="+id).innerHTML;
    const answer = document.getElementById("answerBox="+id).value;

    const obj = {
        id:id,
        name:name,
        question:question,
        answer:answer,
    };

    console.log(obj)
    sendAnswer(obj);

    removeNode("name="+obj.id);
    removeNode("question="+obj.id);
    removeNode("answerBox="+obj.id);
    removeNode("Questions="+obj.id);
}

function removeNode(id){
    const node = document.getElementById(id);
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}

function sendQuestion(data){
    socket.send(SENDQUESTION +SPLITTER+JSON.stringify(data));
}

function processQuestion(button){
    button.disabled = true;
    button.innerHTML = "<h3>Thank you!</h3>"
    const nameForm = document.getElementById("nameForm").value;
    const questionForm = document.getElementById("questionForm").value;

    const obj = {
        name:nameForm,
        question:questionForm
    };

    sendQuestion(obj);

    const h2 = "H2";
    const h3 = "H3";
    const data = obj;

    const div = document.createElement("div");
    div.setAttribute("id", "Questions="+data.name);

    const question = document.createElement(h3);
    question.setAttribute("id", "question=" + data.name);

    const name = document.createElement(h2);
    name.setAttribute("id", "name=" + data.name);

    const textName = document.createTextNode(data.name);
    const textQuestion = document.createTextNode(data.question);

    name.appendChild(textName);
    question.appendChild(textQuestion);

    div.appendChild(name);
    div.appendChild(question);

    const list = document.getElementById("Questions");
    list.insertBefore(div, list.childNodes[2]);
}

function receiveAnswer(array){
    const h2 = "H2";
    const h3 = "H3";
    for(let ii = 0; ii < array.length; ii++){
        const data = array[ii];
        const div = document.createElement("div");
        div.setAttribute("id", "Answers="+data.id);

        const answer = document.createElement(h2);
        answer.setAttribute("id", "answer=" + data.id);

        const question = document.createElement(h3);
        question.setAttribute("id", "question=" + data.id);

        const name = document.createElement(h3);
        name.setAttribute("id", "name=" + data.id);

        const textName = document.createTextNode(data.name);
        const textQuestion = document.createTextNode(data.question);
        const textAnswer = document.createTextNode(data.answer);

        name.appendChild(textName);
        answer.appendChild(textAnswer);
        question.appendChild(textQuestion);

        div.appendChild(name);
        div.appendChild(question);
        div.appendChild(answer);

        document.getElementById("Answers").appendChild(div);
    }
}

function receiveQuestion(array){
    const h2 = "H2";
    const h3 = "H3";
    for(let ii = 0; ii < array.length; ii++){
        const data = array[ii];

        const div = document.createElement("div");
        div.setAttribute("id", "Questions="+data.id);

        const question = document.createElement(h3);
        question.setAttribute("id", "question=" + data.id);

        const name = document.createElement(h2);
        name.setAttribute("id", "name=" + data.id);

        const textName = document.createTextNode(data.name);
        const textQuestion = document.createTextNode(data.question);

        name.appendChild(textName);
        question.appendChild(textQuestion);

        div.appendChild(name);
        div.appendChild(question);

        document.getElementById("Questions").appendChild(div);
    }
}

function loggedIn(){
    const questions = document.getElementById("Questions");
    for(let ii = 1; ii < questions.children.length; ii++){
        const question = questions.children[ii];
        const id = question.id.split("=")[1];
        const answerBox = document.createElement("input");
        answerBox.setAttribute("id", "answerBox="+id);

        const button = document.createElement("button");
        button.setAttribute("id", "answerButton="+id);
        button.setAttribute("onclick", "processAnswer(this)");

        button.appendChild(document.createTextNode("Answer!"));

        question.appendChild(answerBox);
        question.appendChild(button);
    }
}