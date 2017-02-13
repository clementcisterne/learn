var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');

var session = require('cookie-session'); // Charge le middleware de sessions
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var port = process.env.PORT || 8080; 

var nombreClientEnLigne = 1;
var clients = ['lamouche']; // le client de base "lamouche"


app.use(session({secret: 'todotopsecret'}))

// Gestion de la connexion
.use(function(req, res, next){
    if (typeof(req.session.todolist) == 'undefined') { // Si il n'y a aucune liste de tache on en crée une vide
        req.session.todolist = [];
    } 
    else if(typeof(req.session.clients) == 'undefined') {
        req.session.clients = clients;
    } 
    next();
})

.get('/', function(req, res){
    res.render('index.ejs');
})

// Gestion des sockets
io.sockets.on('connection', function (socket,pseudo) {
   
// Gestion des routes   

    // Connexion à l'application mytodo
    app.get('/mytodo/:pseudo', function(req, res, next){
        if(req.params.pseudo != ''){
            if(clients.indexOf(req.params.pseudo) != -1){ // Si le pseudo n'existe pas
                req.session.clients = clients;
                res.render('mytodo.ejs', {todolist: req.session.todolist, nombreClientEnLigne: nombreClientEnLigne, pseudo: req.params.pseudo, clients: req.session.clients});

                console.log(req.params.pseudo + " is connected");
                console.log('customers online: '+clients.length);
            } else {
                socket.emit('erreur', {message: req.params.pseudo+' n\'existe pas sur le serveur ...\nVous devez vous identifier depuis le fichier root !'});
                //res.redirect('/');
            }
        } else {
            next(); 
        }
    })

    .get('/mytodo', function(req, res){
        req.session.clients = clients;
        res.render('mytodo.ejs', {todolist: req.session.todolist, nombreClientEnLigne: nombreClientEnLigne, clients: req.session.clients}); 
        
    })  

    .get('/', function(req, res){   
        res.render('index.ejs');
    })

    .post('/mytodo/ajouter/', urlencodedParser, function(req, res){
        if(req.params.id != ''){
            if(req.session.todolist.indexOf(req.body.newtodo) == -1){
                req.session.todolist.push(req.body.newtodo);
                socket.broadcast.emit('reload', {message: 'page reload'});
            } else {
                socket.emit('erreur', {message: 'La tâche '+req.body.newtodo+' existe déjâ !'});
            }
        }
        res.redirect('/mytodo');
    })

    .get('/mytodo/supprimer/:id', function(req, res){
        if(req.params.id != ''){
            req.session.todolist.splice(req.params.id, 1);
            socket.broadcast.emit('reload');
        }
        res.redirect('/mytodo');
    })

    /* On redirige vers la todolist si la page demandée n'est pas trouvée */
    .use(function(req, res){
        res.redirect('/');
    });


// Ecoute

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
    socket.on('nouveau_client', function(pseudo, fn) {
        if(pseudo != ''){
            if(clients.indexOf(pseudo) == -1){
                if(pseudo != null){
                    clients.push(pseudo);
                    socket.broadcast.emit('reload');
                }
            } else {
                socket.emit('erreur', {message: 'L\'utilisateur '+pseudo+' est déjâ connecté'});
            }
        } else {
            socket.emit('erreur', {message: 'Vous avez entré un pseudo invalide !'});
        }
    })

    // Gestion des gens qui quittent l'application
    socket.on('leaveApp', function(pseudo){
        id = 0;
        while( pseudo != clients[id] ){
            id++;
        }
        console.log('id client disconnected : '+id);
        clients.splice(id, 1);
        socket.broadcast.emit('reload');
        console.log(pseudo + ' is disconnected');
    });

console.log(clients);
console.log("Server solicited.");
console.log('');
});
server.listen(port);   