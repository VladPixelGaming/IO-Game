var express  = require("express");
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require("fs");

var players = {};
var lastPlayerId = -1;

http.listen(8080, function(){
    console.log('listening on *:3000');
});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.use("/models", express.static(__dirname + '/models'));
app.use("/textures", express.static(__dirname + '/textures'));
app.use("/js", express.static(__dirname + '/js'));

io.on('connection', function(socket){
    socket.on('auth', function(nickname){
        if(typeof players[socket.id] === 'object') {
            removePlayer(socket.id);
        }

        if(nickname !== "") {
            nickname = escapeHtml(nickname);
            addPlayer(socket.id, nickname);
            io.to(socket.id).emit('authSuccess');
            console.log(nickname + " зашёл.");
        } else {
            io.to(socket.id).emit('authFailure');
        }

    });
    socket.on('disconnect', function(){
        if(typeof players[socket.id] === 'object') {
            console.log(players[socket.id].name + " вышел.");
            removePlayer(socket.id);
        }
    });
    socket.on('respawn', function(){
        removePlayer(socket.id);
        io.sockets.sockets[socket.id].disconnect();
    });
    socket.on('attack', function(socketId){
        if(typeof players[socketId] === 'object' && typeof players[socket.id] === 'object') {
            if(players[socketId].hp > 0 && players[socket.id].hp > 0) {
                io.to(socketId).emit('attackReaction', [players[socket.id].x, players[socket.id].z]);
                io.emit('attackDamage', socketId);
                players[socketId].hp -= 20;
                if(players[socketId].hp < 0) players[socketId].hp = 0;
                if(players[socketId].hp == 0) {
                    io.to(socketId).emit('killerName', players[socket.id].name);
                }
            }
        }
    });
    socket.on('playerState', function(data) {
        if(typeof players[socket.id] === "object") {
            if(data.x !== undefined) {
                players[socket.id].x = data.x;
                players[socket.id].y = data.y;
                players[socket.id].z = data.z;
                players[socket.id].rotation = data.rotation;
            }
        }
    });
    socket.on('chatSend', function(msg){
        if(typeof players[socket.id] === "object") {
            if (msg != "") {
                msg = escapeHtml(msg);
                var slicedMsg = msg.slice(0, 256);
                if (slicedMsg.length < msg.length) {
                    slicedMsg += '...';
                }
                var msgObj = {
                    text: slicedMsg,
                    sender: players[socket.id].name
                };
                io.emit('chatGet', msgObj);
            }
        }
    });
});

setInterval(function() {
    for (var socketId in players) {
        var player = players[socketId];
        var playersInRange = {};
        for (var socketId2 in players) {
            var playerEntity = players[socketId2];
            if(pointPointDistance(playerEntity.x, playerEntity.z, player.x, player.z) < 100) {
                playersInRange[socketId2] = players[socketId2];
            }
        }
        io.to(player.socketId).emit('state', playersInRange);
    }
}, 1000 / 15);

function pointPointDistance(ax, az, bx, bz){
    var dx = bx-ax;
    var dz = bz-az;
    return Math.sqrt(dx*dx + dz*dz);
}

function addPlayer(socketId, nickname) {
    players[socketId] = {
        id: lastPlayerId + 1,
        socketId: socketId,
        name: nickname,
        x: 200,
        z: 200,
        y: 0,
        hp: 100,
        speed: 0,
        rotation: 0,
        anim: "idle",
        color: getRandomColor()
    };

    lastPlayerId++;
}

function getRandomColor() {
    var letters = '0123456789abcdef';
    var color = '0x';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function removePlayer(socketId) {
    delete players[socketId];
}

function toRad(degrees) {
    return degrees * Math.PI / 180;
};

function toDeg(radians) {
    return radians * 180 / Math.PI;
};

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
