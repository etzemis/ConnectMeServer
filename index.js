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
var TripRequest = require('./app/model/TripRequest')
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

	var connectedUser = basicAuth(req);
	console.log("\nFetch Travellers: "+connectedUser.name+"\n")

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
			res.send("");
		}
		else
		{
			console.log('User not found !');
			res.status(401).send('Can not find user');
		}
	});
});

















//**************************************
// TRIP Request
//**************************************







//**************************************
// TRIP Travellers Around Me
//**************************************

// Returns the travellers that are around the user
app.get('/trip/travellers', auth, function (req, res)
{
	console.log("\nTrip Request Fetch Travellers\n")
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
			User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $maxDistance: highProximityDistance}, 'email': {$ne: connectedUser.name}, 'statusMode': {$eq: 2}}, "username email location destination imageUrl").limit(limit).sort().exec(function(err, highProxDestinations)
			{
				if (err)
				{
					res.status(500).send('Server Internal Error');
				}
				User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $minDistance: highProximityDistance, $maxDistance: mediumProximityDistance}, 'email': {$ne: connectedUser.name}, 'statusMode': {$eq: 2} }, "username email location destination imageUrl").limit(limit).sort().exec(function(err, medProxDestinations)
				{
					if (err)
					{
						res.status(500).send('Server Internal Error');
					}
					User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $minDistance: mediumProximityDistance, $maxDistance: lowProximityDistance}, 'email': {$ne: connectedUser.name}, 'statusMode': {$eq: 2}}, "username email location destination imageUrl").limit(limit).sort().exec(function(err, lowProxDestinations)
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


//**************************************
// Create Trip Request
//**************************************

app.post('/tripRequest/create', auth, function (req, res)
{

	var user = basicAuth(req);
	TripRequest.find({$or:[{'from': user.name}, {'to': user.name}]}, 'From', function (err, inTripRequest)
	{
		console.log("In Trip Request"+inTripRequest);
		if (err)
		{
			console.log(err);
			res.status(500).send('Server Internal Error');
		}
		else
		{
			var travellers = req.body.travellers;
			var numOfTravellers = travellers.length;
			if (!inTripRequest.length)
			{
				var coTravellers = [];
				for (let i = 0; i < numOfTravellers; i++)
				{

					TripRequest.find({$or: [{'From': travellers[i]}, {'To': travellers[i]}]}, 'From', function (err, invitedInTripRequest)
					{
						// Maybe we need to check that User is in mode 2. Handle the case that he user has exited
						if (err)
						{
							res.status(500).send('Server Internal Error');
						}
						else
						{
							if (!invitedInTripRequest.length)
							{
								var newTripRequest = new TripRequest({
									from: user.name,
									to: travellers[i],
									statusMode: 0
								});
								newTripRequest.save(function (err)
								{
									if (err)
									{
										res.status(500).send('Server Internal Error');
									}


									coTravellers.push(travellers[i]);
									if ( i === numOfTravellers-1)
									{
										//Update the State of The Creator to 3:
										User.update({'email': user.name}, {$set: {'statusMode': 3}}, function (err, recordsUpdated)
										{
                                            if (err)
                                            {
                                                console.log(err);
                                                res.status(500).send('Server Internal Error');
                                            }
                                            if (recordsUpdated)
                                            {
                                                res.json({"success": coTravellers});
                                            }
                                            else
                                            {
                                                res.status(500).send('Server Internal Error');
                                            }
										});



									}
								});
							}
							else
							{
								console.log('TripRequest was insuccessful!');
							}
						}
					});
				}
			}
			else
			{
				res.json({message: "You are already in a trip request!"});
			}
		}
	});
});


//**************************************
// Refresh Invitations
//**************************************

app.get('/tripRequest/refresh/invitations', auth, function (req, res)
{

	var user = basicAuth(req);
	TripRequest.find({'to': user.name}, 'from', function (err, creatorOfTripRequest)
	{
		if (err)
		{
			console.log(err);
			res.status(500).send('Server Internal Error');
		}
		else
		{
            if (creatorOfTripRequest.length)
			{
                // Check if the request is not already rejected
				TripRequest.find({'from': creatorOfTripRequest[0].from, 'statusMode': {$ne: 2}},  'to', function (err, invitedInTripRequest)
				{
					if (err)
					{
						res.status(500).send('Server Internal Error');
					}
					else
					{
						if(invitedInTripRequest.length) {
                            console.log(invitedInTripRequest.length);
							var coTravellers = [creatorOfTripRequest[0].from];

							for (var i = 0; i < invitedInTripRequest.length; i++)
							{
								if (invitedInTripRequest[i].to!== user.name)
								{
									coTravellers.push(invitedInTripRequest[i].to);
								}
							}
							console.log(coTravellers)

							User.find({'email': {$in: coTravellers}}, function (err, usersInTrip) {
								if (err) {
									res.status(500).send('Server Internal Error');
								}
								else {
									if (usersInTrip.length !== 0) {
										//update my mode put in Trip
										res.json(usersInTrip);
									}
								}
							});
						}
						else
						{
							res.json({message: "The trip was cancelled!"});
						}
					}
				});
			}
			else
			{
				console.log("No Invitations Yet")
				res.json({message: "No invitations yet!"});
			}
		}
	});
});


//**************************************
// Refresh Status
//**************************************

app.get('/tripRequest/refresh/status', auth,  function (req, res)
{
    console.log("Step1");      // your JSON
    var user = basicAuth(req);
    console.log(user)

    //Check who send the request (Creator - Traveller)
    TripRequest.find({'from': user.name, 'statusMode':{$ne: 2}}, 'to statusMode', function (err, isCreatorOfTripRequest)
    { // If I am the creator then give me the not rejected travellers
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        }
        else
        {
            console.log("Step2");
            // If I am the Creator of the trip!
            if (isCreatorOfTripRequest.length)
            {
                //1a found travellers
                //create TravellerStatus
                console.log(isCreatorOfTripRequest);
                console.log("Step3");
                var travellerStatus = [];
                for (var i = 0 ; i < isCreatorOfTripRequest.length; i++)
                {
                    let email = isCreatorOfTripRequest[i].to;
                    let status = isCreatorOfTripRequest[i].statusMode;

                    travellerStatus.push({email: status});
                }

                // Calculate the Status of The Trip!
                let sum = isCreatorOfTripRequest.reduce(function(a, b){return a.statusMode+b.statusMode});
                if(sum === isCreatorOfTripRequest.length)
                {
                    console.log("Step4");
                    //Trip Has Started
                    res.json({"tripStatus": 1, "travellerStatus": travellerStatus});

                    //build a trip
                    //delete ths request?
                }
                else
                {
                    console.log("Step5");
                    res.json({"tripStatus": 0, "travellerStatus": travellerStatus});
                }
                return;
            }
            // I am not the Creator!!!
            else
            {
                console.log("Step6");
                //Fetch my Trip Request
                TripRequest.find({'to': user.name, statusMode:{$eq: 1}}, 'from statusMode', function (err, myTripRequest)
                {
                    if (err)
                    {
                        console.log(err);
                        res.status(500).send('Server Internal Error');
                    }
                    else
                    {
                        console.log("Step7");
                        // if I have accepted  then get me the status of all the other travellers!!
                        if (myTripRequest.length)
                        {
                            TripRequest.find({'from': myTripRequest[0].from, 'to': {$ne: user.name}}, 'to statusMode', function (err, invitedInTripRequest)
                            {

                                if (err)
                                {
                                    res.status(500).send('Server Internal Error');
                                }
                                else
                                {
                                    console.log("Step8");
                                    //creator of trip Request
                                    var travellerStatus = {};
                                    travellerStatus[myTripRequest[0].from] = 1;

                                    //IF there are at lest two persons in the Trip (1 Co- Traveller)!
                                    if (invitedInTripRequest.length>0)
                                    {
                                        //create Travellers!

                                        console.log("Step9");
                                        var sum = 0
                                        for (var i = 0 ; i < invitedInTripRequest.length; i++)
                                        {
                                            travellerStatus[invitedInTripRequest[i].to] = invitedInTripRequest[i].statusMode
                                            sum += invitedInTripRequest[i].statusMode
                                        }
                                        if (sum === invitedInTripRequest.length)
                                        {

                                            console.log("Step10");
                                            res.json({"tripStatus": 1, "travellerStatus": travellerStatus});

                                            //build a trip
                                            //delete ths request?
                                        }
                                        else
                                        {
                                            console.log("Step11");
                                            res.json({"tripStatus": 0, "travellerStatus": travellerStatus});
                                        }
                                    }

                                    // If there are two persons. Me and the creator Then Start Trip!
                                    else
                                    {
                                        console.log("Step12");
                                        res.json({"tripStatus": 1, "travellerStatus": travellerStatus});
                                        //build a trip
                                        //delete ths request?
                                    }

                                }
                            });
                        }
                        // 1b Iam the creator. but could not find travellers
                        else
                        {
                            console.log("step13");
                            res.json({"tripStatus": 2, "travellerStatus": {"":0}});
                        }
                    }
                });
            }
        }
    });

});


//**************************************
// Response Trip Request
//**************************************
app.post('/tripRequest/response', auth, function (req, res)
{
    console.log(req.body)
    var user = basicAuth(req);
    res.send("")

});


//**************************************
// CancelTrip Request
//**************************************
app.get('/tripRequest/cancel', auth, function (req, res)
{
    console.log(req.body)
    console.log("cancelled Trip Successfully")
    var user = basicAuth(req);
    res.send("")


});


//Create Server

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
