var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');

var session = require('cookie-session'); // Charge le middleware de sessions
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var nombreClientEnLigne = 0;
var clients = [];



// Gestion de la connexion
io.sockets.on('connection', function (socket, pseudo) {
    
    
    /* On utilise les sessions */
    app.use(session({secret: 'todotopsecret'}))

// Gestion des routes
    // Si il n'y a aucune lsite de tache on en crée une vide
    .use(function(req, res, next){
        if (typeof(req.session.todolist) == 'undefined') {
            req.session.todolist = [];
        }
        next();
    })

    .get('/', function(req, res){
        res.render('../index.ejs');
    })

    .get('/todo', function(req,res){
        res.render('todo.ejs', {todolist: req.session.todolist, idClient: nombreClientEnLigne+1, nombreClientEnLigne: nombreClientEnLigne});
    })

    .post('/todo/ajouter', urlencodedParser, function(req,res){
        if(req.params.id != ''){
            req.session.todolist.push(req.body.newtodo);
        }
        res.redirect('/todo');
    })

    .get('/todo/supprimer/:id', urlencodedParser, function(req,res){
        if(req.params.id != ''){
            req.session.todolist.splice(req.params.id, 1);
        }
        res.redirect('/todo');
    })

    /* On redirige vers la todolist si la page demandée n'est pas trouvée */
    .use(function(req, res){
        res.redirect('/');
    });

// Ecoute
    // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
    socket.on('nouveau_client', function(pseudo) {
        nombreClientEnLigne++;
        pseudo = ent.encode(pseudo);
        socket.pseudo = pseudo;
        socket.idClient = nombreClientEnLigne;
        socket.broadcast.emit('nouveau_client', {pseudo: socket.pseudo, idClient: socket.idClient});
        clients.push(pseudo);
        
        console.log(pseudo + " is connected");
        console.log('customers online: '+nombreClientEnLigne);
        console.log(clients);
    });

    // Dès qu'on reçoit une tache, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('addTache', function (idTache, newtodo) {
        idTache = ent.encode(idTache);
        newtodo = ent.encode(newtodo);
        //req.session.todolist.push(req.body.newtodo);
        socket.broadcast.emit('addTache', {idTache: socket.idTache, newtodo: socket.newtodo});
    });


    socket.on('deleteTache', function (idTache) {
        //req.session.todolist.splice(req.params.id, 1);
        socket.broadcast.emit('deleteTache', socket.idTache);
    });

    // gestion des gens qui quittent le chat
    socket.on('leaveApp', function(pseudo){
        pseudo = ent.encode(pseudo);   
        socket.broadcast.emit('leave', pseudo);
        nombreClientEnLigne--;
        clients.splice(pseudo, 1);

        console.log(pseudo + ' is disconnected');
    });

});
//console.log(session.todolist);
server.listen(8080);   