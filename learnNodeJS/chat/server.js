var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');

app.get('/', function(req,res){
    res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket, pseudo) {

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
    socket.on('nouveau_client', function(pseudo) {
        console.log(pseudo + " connected");
        pseudo = ent.encode(pseudo);
        socket.pseudo = pseudo;
        socket.broadcast.emit('nouveau_client', pseudo);
    });

    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message) {
        console.log(message);
        message = ent.encode(message);
        socket.broadcast.emit('message', {pseudo: socket.pseudo, message: message});
    });

    // gestion des gens qui quittent le chat
    socket.on('leave', function(pseudo){
        console.log(pseudo + ' disconnect');
        pseudo = ent.encode(pseudo);
        socket.pseudo = pseudo;     
        socket.broadcast.emit('leave', pseudo);
    });


});


server.listen(8080);	