//1
var http = require('http');
	fs = require('fs')
	express = require('express')
	path = require('path')
	mongoose = require('mongoose')

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

// Connect to the db
mongoose.connect(url);

// Folder to store the image urls
app.use(express.static(path.join(__dirname, 'public')));
//f you are using valid JSON and are POSTing it with Content-Type: application/json, 
//then you can use the bodyParser to parse place the result in request body of your router.
app.use(express.bodyParser());



//*************
//*** SERVER API
//*************

// Register a user
app.post('/register', function (req, res) {
	console.log(req.body);      // your JSON


	var chris = new User({
  		username: req.body.username,
  		email: req.body.email,
  		password: req.body.password,
  		address: req.body.address 
	});
	chris.save(function(err) {
  	if (err) throw err;
		console.log('User saved successfully!');
	});

  res.send('<html><body><h1>User Registration</h1></body></html>');
});
 
// Login User
app.post('/log-in', function (req, res) {
  	res.send('<html><body><h1>User Log In</h1></body></html>');
});

// Update the location of a specific user
app.post('/location', function (req, res) {
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
