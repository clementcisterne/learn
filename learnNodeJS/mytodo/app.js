var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');

var session = require('cookie-session'); // Charge le middleware de sessions
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var nombreClientEnLigne = 0;
var clients = ['lamouche'];



// Gestion de la connexion
io.sockets.on('connection', function (socket) {
    

/*if(socket.pseudo != 'undefined'){
    console.log('undefined connection');
} else {
    console.log('authentificated connection');
}*/
    
    
    /* On utilise les sessions */
    app.use(session({secret: 'todotopsecret'}))

// Gestion des routes
    // Si il n'y a aucune liste de tache on en crée une vide
    .use(function(req, res, next){
        if (typeof(req.session.todolist) == 'undefined') {
            req.session.todolist = [];
        } else if(typeof(req.session.clients) == 'undefined') {
            req.session.clients = [];
        } 
        next();
    })


    .get('/mytodo/:pseudo', function(req, res, next){
        if(req.params.pseudo != ''){
            if(clients.indexOf(req.params.pseudo) != -1){
                req.session.clients = clients;
                res.render('mytodo.ejs', {todolist: req.session.todolist, nombreClientEnLigne: nombreClientEnLigne, pseudo: req.params.pseudo, clients: req.session.clients});
            
                console.log(req.params.pseudo + " is connected");
                console.log('customers online: '+clients.length);
                console.log(clients);
            } else {
                socket.emit('erreur', {message: 'Vous devez vous connecter depuis le fichier / !'}),
                res.redirect('/mytodo');
            }
        } else {
            next();
        }
    })

    .get('/mytodo', function(req, res){
        if(socket.pseudo != 'undefined'){
            res.redirect('/mytodo/'+socket.pseudo);
        } else {
            req.session.clients = clients;
            res.render('mytodo.ejs', {todolist: req.session.todolist, nombreClientEnLigne: nombreClientEnLigne, clients: req.session.clients}); 
        }
    })

    .get('/', function(req, res){
        res.render('../index.ejs', {message: 'bonjour'});
    })

    .post('/mytodo/ajouter', urlencodedParser, function(req, res){
        if(req.params.id != ''){
            if(req.session.todolist.indexOf(req.body.newtodo) == -1){
                req.session.todolist.push(req.body.newtodo);
                socket.broadcast.emit('reload');
            } else {
                socket.emit('erreur', {message: 'La tâche '+req.body.newtodo+' existe déjâ !'});
            }
        }
        res.redirect('/mytodo');
    })

    .get('/mytodo/supprimer/:id', urlencodedParser, function(req, res){
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
        if(pseudo != 'undefined'){
            if(clients.indexOf(pseudo) == -1){
                pseudo = ent.encode(pseudo);
                clients.push(pseudo);
                socket.broadcast.emit('reload');
                fn(pseudo);

            } else {
                socket.emit('erreur', {message: 'L\'utilisateur '+pseudo+' est déjâ connecté'});
            }
        } else {
            socket.emit('erreur', {message: 'Vous avez entré un pseudo invalide !'});
        }
    })

/*    .on('verifier_page_client', function(pseudo, fn){

    })*/

    // gestion des gens qui quittent l'application
    .on('leaveApp', function(pseudo){
        pseudo = ent.encode(pseudo);   
        socket.broadcast.emit('reload');

        clients.splice(pseudo, 1);
        console.log(pseudo + ' is disconnected');
    });

console.log(clients);
});
server.listen(8080);   