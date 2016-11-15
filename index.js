//**************************************
// Include Necessary Files
//**************************************
var http = require('http');
	fs = require('fs')
	express = require('express')
	path = require('path')
	mongoose = require('mongoose')
	passwordHash = require('password-hash');
	basicAuth = require('basic-auth')


//**************************************
// Load the Models
//**************************************

var User = require('./app/model/User');

//**************************************
// Init Express and Set the port to 3000
//**************************************

var app = express();
app.set('port', process.env.PORT || 3000);

//**************************************
// Connect To Mongo Database
//**************************************

var dbUrl = "mongodb://localhost:27017/ConnectMeDB"
	// var url = "mongodb://etzemis:Qwerty15@waffle.modulusmongo.net:27017/e4Buwaxa"
mongoose.connect(dbUrl);


//**************************************
// Create Public folder for String User Images. Setup JSON Parsing
//**************************************

app.use(express.static(path.join(__dirname, 'public')));
//f you are using valid JSON and are Posting it with Content-Type: application/json,
//then you can use the bodyParser to parse place the result in request body of your router.
app.use(express.bodyParser());



//**************************************
// Basic Authorization
//**************************************

var auth = function (req, res, next)
{
	var user = basicAuth(req);
	if (!user || !user.name || !user.pass)
	{
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		res.send(401).send('No authorization provided');
		return;
	}

	User.findOne({'email': user.name}, 'password', function (err, userLocal)
	{
		if (err)
		{
			console.log('BASIC AUTH: Error in querying');
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			res.status(500).send('Error in querying database');
			return next(err);
		}
		if (userLocal)
		{
			if (passwordHash.verify(user.name + userLocal.password, user.pass))
			{   // pass is the hashed string
				next();
			}
			else
			{
				console.log('BASIC AUTH: Passwords do not match');
				res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
				res.status(401).send('passwords do not match');
				return;
			}
		}
		else
		{
			console.log('BASIC AUTH: Could not find user');
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			res.status(401).send('Could not find user');
			return;
		}
	});
};


//**************************************
// SERVER API
//**************************************




//**************************************
// Registration
//**************************************

app.post('/register', function (req, res) {

	// Generated Hashed String
	var hashed_string= passwordHash.generate(req.body.email+req.body.password);

	// If Photo exists, Parse ti and Save it. Otherwise save "Default"
    var photoName = "default"
    if (req.body.profilePhoto !== "default")
    {
        // Parse and save the Profile Image
        photoName = req.body.email.substring(0, req.body.email.indexOf('.'));
        photoName += ".png"
        require("fs").writeFile("./public/" + photoName, req.body.profilePhoto, 'base64', function (err) {
			if (err)
			{
				console.log(err);
				res.status(500).send('Server Internal Error')
			}
        });
    }

    //Check Email Availability

	User.findOne({'email': req.body.email}, 'password secretToken', function (err, user)
	{
		if (err)
		{
			console.log(err)
			res.status(500).send('Server Internal Error');
		} else
		{
			if (user)
			{	// If already exists
				res.json({message: "User Already Exists"});
			}
			else
			{
				//Create User
				var newUser = new User({
					statusMode: 0,
					username: req.body.username,
					email: req.body.email,
					password: req.body.password,
					address: req.body.address,
					secretToken: hashed_string,
					imageUrl: photoName
				});

				//Save User to DB
				newUser.save(function(err)
				{
					if (err)
					{
						console.log(err)
						res.status(500).send('Server Internal Error');
					}
					else
					{
						console.log("\nRegistration: User "+req.body.email+"\n")
						res.json({success: "User Registration Successful"});
					}
				});
			}
		}
	});
});



//**************************************
// Login
//**************************************
app.post('/login', function (req, res)
{

	User.findOne({ 'email': req.body.email }, 'username imageUrl password secretToken', function (err, user)
	{
  		if (err)
  		{
  			console.log(err)
			res.status(500).send('Server Internal Error')
  		}
  		else
		{
            if (!user)
            {
                res.json({message: "Invalid Username or Password"})
            }
            else {

                res.setHeader('Content-Type', 'application/json');
                if (req.body.password != user.password)
                {
                    res.json({message: "Invalid Username or Password"})
                }
                else
				{
					User.update({'email': req.body.email}, {$set: {'statusMode': 1}}, function (err, result)
					{
						console.log(result)
						if (result)
						{
							var jsonToReturn = {
								token: user.secretToken,
								username: user.username,
								imageUrl: user.imageUrl};

							res.json(jsonToReturn);

							console.log("\nLog-In: User "+req.body.email+"\n")
						}
						else
						{
							console.log(err)
							res.status(500).send('Server Internal Error')
						}
					});



                }
            }
        }
	})
});

//**************************************
// Activate User
//**************************************
app.get('/user/activate', auth, function (req, res)
{
	var user = basicAuth(req);

	User.update({'email': user.name}, {$set: {'statusMode': 1}}, function (err, result)
	{
		console.log(result)
		if (result)
		{
			res.send("<html><body><h1> Deactivated User</h1></body></html>");

			console.log("\nActivated: User "+ user.name+"\n")
		}
		else
		{
			console.log(err)
			res.status(500).send('Server Internal Error')
		}
	});
});

//**************************************
// Deactivate User
//**************************************
app.get('/user/deactivate', function (req, res)
{
	var user = basicAuth(req);

	User.update({'email': user.name}, {$set: {'statusMode': 0}}, function (err, result)
	{
		console.log(result)
		if (result)
		{
			res.send("<html><body><h1> Deactivated User</h1></body></html>");

			console.log("\nDeactivated: User "+ user.name+"\n")
		}
		else
		{
			console.log(err)
			res.status(500).send('Server Internal Error')
		}
	});
});


//**************************************
// Update Location of User
//**************************************

app.post('/location', auth, function (req, res)
{
	var user = basicAuth(req);
	User.update({'email': user.name}, {$set: {'location': [(req.body.longitude), (req.body.latitude)]}}, function (err, result)
	{
		if (err)
		{
			console.log(err);
			res.status(500).send('Server Internal Error');
		}
		if (result)
		{
			console.log('Location Update: '+user.name);
			res.send("<html><body><h1>Post Location was Successful</h1></body></html>");
		}
		else
		{
			res.send(401).send('User Not Found');
		}
	});
});


//**************************************
// Travellers Around ME
//**************************************

// Returns the travellers that are around the user
app.get('/travellers', auth, function (req, res)
{
	console.log("\nFetch Travellers\n")
	var connectedUser = basicAuth(req);
	User.findOne({'email': connectedUser.name}, 'location', function (err, user)
	{
		if (err)
		{
			res.status(500).send('Server Internal Error');
		}
		else
		{
			// console.log(user);
			// limit results
			var limit = 10;
			// Filter Users with distance less than 500m
			var maxDistance = 0.5;

			// Convert the distance to radians
			// Radius of Earth is approximately 6371 kilometers
			maxDistance /= 6371;

			// find a location
			User.find({location: { $nearSphere: [user.location[0], user.location[1]], $maxDistance: maxDistance}, email: {$ne: connectedUser.name}, statusMode: {$eq: 2}}, "username email location destination imageUrl").limit(limit).exec(function(err, locations)
			{
				if (err)
				{
					res.status(500).send('Server Internal Error');
				}
				res.json(locations);
			});
		}
	});
});



//**************************************
// Destination
//**************************************

app.post('/destination', auth, function (req, res)
{

	var user = basicAuth(req);
	User.update({'email': user.name}, {$set: {	'destination.address': req.body.address,
												'destination.region': req.body.region,
												'destination.coordinates': [req.body.longitude,req.body.latitude],
												'destination.extraPersons': req.body.extraPersons},
												'statusMode': 2}, function (err, recordsUpdated)
	{
		if (err)
		{
			console.log(err);
			res.status(500).send('Server Internal Error');
		}
		if (recordsUpdated)
		{
			console.log('User location updated successfully!');
			User.findOne({'email': user.name}, function (err, user)
			{
				console.log(user);
			});
			res.send("<html><body><h1>Post destination was successful</h1></body></html>");
		}
		else
		{
			console.log('User not found !');
		}
		res.send("<html><body><h1>Post destination was unuccessful :( </h1></body></html>");
		res.json({"OK": "Insert of Destination was successful"});

	});
});



//**************************************
// TRIP Travellers Around Me
//**************************************

// Returns the travellers that are around the user
app.get('/trip/travellers', auth, function (req, res)
{
	console.log("\nFetch Travellers\n")
	var connectedUser = basicAuth(req);
	User.findOne({'email': connectedUser.name}, 'destination', function (err, user)
	{
		if (err)
		{
			res.status(500).send('Server Internal Error');
		}
		else
		{
			// console.log(user);
			// limit results
			var limit = 10;


			// Convert the distance to radians
			// Radius of Earth is approximately 6371 kilometers
			earthRadiusConstant = 6371;
			// Filter Users with distance less than 500m
			var highProximityDistance = 1/earthRadiusConstant;
			var mediumProximityDistance = 2/earthRadiusConstant;
			var lowProximityDistance = 5/earthRadiusConstant;



			// find a location
			User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $maxDistance: highProximityDistance}, 'email': {$ne: connectedUser.name} }, "username email location destination imageUrl").limit(limit).sort().exec(function(err, highProxDestinations)
			{
				if (err)
				{
					res.status(500).send('Server Internal Error');
				}
				User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $minDistance: highProximityDistance, $maxDistance: mediumProximityDistance}, 'email': {$ne: connectedUser.name} }, "username email location destination imageUrl").limit(limit).sort().exec(function(err, medProxDestinations)
				{
					if (err)
					{
						res.status(500).send('Server Internal Error');
					}
					User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $minDistance: mediumProximityDistance, $maxDistance: lowProximityDistance}, 'email': {$ne: connectedUser.name} }, "username email location destination imageUrl").limit(limit).sort().exec(function(err, lowProxDestinations)
					{
						if (err)
						{
							res.status(500).send('Server Internal Error');
						}
						var jsonToReturn = {
							"0": highProxDestinations,
							"1": medProxDestinations,
							"2":lowProxDestinations
						}
						res.json(jsonToReturn);
					});
				});
			});




		}
	});
});



//Create Server

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
