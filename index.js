//1
var http = require('http');
	fs = require('fs')
	express = require('express')
	path = require('path')
	mongoose = require('mongoose')
	passwordHash = require('password-hash');
	basicAuth = require('basic-auth')

// var options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem')
// };


// Load the model
var User = require('./app/model/User');

var app = express();
app.set('port', process.env.PORT || 3000);

// Connection URL. This is where your mongodb server is running.
var url = "mongodb://localhost:27017/ConnectMeDB"
//var url = "mongodb://etzemis:Qwerty15@waffle.modulusmongo.net:27017/e4Buwaxa"
// Connect to the db
mongoose.connect(url);

// Folder to store the image urls
app.use(express.static(path.join(__dirname, 'public')));
//f you are using valid JSON and are POSTing it with Content-Type: application/json, 
//then you can use the bodyParser to parse place the result in request body of your router.
app.use(express.bodyParser());

//Authorize User with Basic Auth
var auth = function (req, res, next) {
  	var user = basicAuth(req);
  	if (!user || !user.name || !user.pass) {
    	res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    	res.send(401).send('No authorization provided');
    	return;
  	}
  	console.log(user.name)
  	User.findOne({ 'email': user.name }, 'password', function (err, userLocal) {
  		if (err) {
  			console.log('BASIC AUTH: Error in querying');
  			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    		res.status(401).send('Error in querying database');
    		return next(err);
  		}
  		if (userLocal){
	  		console.log('Basic Auth:  Found.user')
	  		if (passwordHash.verify(user.name+userLocal.password, user.pass)) {   // pass is the hashed string
	    		next();
	  		} else {
	  			console.log('BASIC AUTH: Passwords do not match')
	    		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
	    		res.status(500).send('passwords do not match');
	    		return;
	  		}
  		}
  		else{
  			console.log('BASIC AUTH: Could not find user')
	    	res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
	    	res.status(500).send('Could not find user');
	    	return;
  		}
  	})
}



//*************
//*** SERVER API
//*************

// Register a user
app.post('/register', function (req, res) {
	console.log(req.body);      // your JSON

	var hashed_string= passwordHash.generate(req.body.email+req.body.password);
	console.log(hashed_string);
	console.log(passwordHash.verify(req.body.email+req.body.password, hashed_string));

	var chris = new User({
  		username: req.body.username,
  		email: req.body.email,
  		password: req.body.password,
  		address: req.body.address, 
  		secret_token: hashed_string
	});
	chris.save(function(err) {
  		if (err){
  			console.log(err)
  		}
		console.log('User saved successfully!');
	});

  	res.send('<html><body><h1>User Registration</h1></body></html>');
});

 
// Login User
app.post('/login', function (req, res) {
	console.log(req.body);      // your JSON

	User.findOne({ 'email': req.body.email }, 'password secret_token', function (err, user) {
  		if (err) {
  			console.log(err)
  		}
  		console.log('LOGIN: found.user')
  		if (req.body.password == user.password) {
			res.setHeader('Content-Type', 'application/json');
  			res.json({"token": user.secret_token});
  			console.log("LOGIN: Valid User")
		}
		else{
			res.status(500).send('Invalid Username or Password')
		}
	})
});


// Update the location of a specific user
app.post('/location', auth, function (req, res) {
	console.log(req.body); 
  	res.send('<html><body><h1> Post Location</h1></body></html>');
});

// Returns the travellers that are around the user
app.get('/travellers', function (req, res) {
  	res.send('<html><body><h1>Get Travellers</h1></body></html>');
});



//Create Server

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
