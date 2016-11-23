
////**************************************
// Include Necessary Files
//**************************************
var http = require('http');
fs = require('fs');
express = require('express');
path = require('path');
mongoose = require('mongoose');
passwordHash = require('password-hash');
basicAuth = require('basic-auth');


//**************************************
// Load the Models
//**************************************

var User = require('./app/model/User');
var TripRequest = require('./app/model/TripRequest');
var Trip = require('./app/model/Trip');

//
//**************************************
// Init Express and Set the port to 3000
//**************************************

var app = express();
app.set('port', process.env.PORT || 3000);

//**************************************
// Connect To Mongo Database
//**************************************

// var dbUrl = "mongodb://localhost:27017/ConnectMeDB";
var dbUrl = "mongodb://etzemis:1234@waffle.modulusmongo.net:27017/agOdag4u";
mongoose.connect(dbUrl);


//**************************************
// Create Public folder for String User Images. Setup JSON Parsing
//**************************************

app.use(express.static(path.join('./', 'public')));
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
            } else
            {
                console.log('BASIC AUTH: Passwords do not match');
                res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
                res.status(401).send('passwords do not match');
                return;
            }
        } else
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
app.post('/register', function (req, res)
{
    // Generated Hashed String
    var hashed_string = passwordHash.generate(req.body.email + req.body.password);

    // If Photo exists, Parse ti and Save it. Otherwise save "Default"
    var photoName = "default";
    if (req.body.profilePhoto !== "default")
    {
        // Parse and save the Profile Image
        photoName = req.body.email.substring(0, req.body.email.indexOf('.'));
        photoName += ".png";
        require("fs").writeFile("./public/" + photoName, req.body.profilePhoto, 'base64', function (err) {
            if (err)
            {
                console.log(err);
                res.status(500).send('Server Internal Error');
            }
        });
    }

    //Check Email Availability

    User.findOne({'email': req.body.email}, 'password secretToken', function (err, user)
    {
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
        {
            if (user)
            {	// If already exists
                res.json({message: "User Already Exists"});
            } else
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
                newUser.save(function (err)
                {
                    if (err)
                    {
                        console.log(err);
                        res.status(500).send('Server Internal Error');
                    } else
                    {
                        console.log("\nRegistration: User " + req.body.email + "\n");
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

    User.findOne({'email': req.body.email}, 'username imageUrl password secretToken', function (err, user)
    {
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
        {
            if (!user)
            {
                res.json({message: "Invalid Username or Password"});
            } else {

                res.setHeader('Content-Type', 'application/json');
                if (req.body.password !== user.password)
                {
                    res.json({message: "Invalid Username or Password"});
                } else
                {
                    User.update({'email': req.body.email}, {$set: {'statusMode': 1}}, function (err, result)
                    {
                        console.log(result);
                        if (result)
                        {
                            var jsonToReturn = {
                                token: user.secretToken,
                                username: user.username,
                                imageUrl: user.imageUrl};

                            res.json(jsonToReturn);

                            console.log("\nLog-In: User " + req.body.email + "\n");
                        } else
                        {
                            console.log(err);
                            res.status(500).send('Server Internal Error');
                        }
                    });
                }
            }
        }
    });
});

//**************************************
// Activate User
//**************************************
app.get('/user/activate', auth, function (req, res)
{
    var user = basicAuth(req);

    User.update({'email': user.name}, {$set: {'statusMode': 1}}, function (err, result)
    {
        console.log(result);
        if (result)
        {
            res.send("<html><body><h1> Deactivated User</h1></body></html>");
            console.log("\nActivated: User " + user.name + "\n");
        } else
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
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
        console.log(result);
        if (result)
        {
            res.send("<html><body><h1> Deactivated User</h1></body></html>");

            console.log("\nDeactivated: User " + user.name + "\n");
        } else
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
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
            console.log('Location Update: ' + user.name);
            res.send("<html><body><h1>Post Location was Successful</h1></body></html>");
        } else
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
    console.log("\nFetch Travellers: " + connectedUser.name + "\n");

    User.findOne({'email': connectedUser.name}, 'location', function (err, user)
    {
        if (err)
        {
            res.status(500).send('Server Internal Error');
        } else
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
            User.find({location: {$nearSphere: [user.location[0], user.location[1]], $maxDistance: maxDistance}, email: {$ne: connectedUser.name}, statusMode: {$eq: 2}}, "username email location destination imageUrl").limit(limit).exec(function (err, locations)
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
    User.update({'email': user.name}, {$set: {'destination.address': req.body.address,
        'destination.region': req.body.region,
        'destination.coordinates': [req.body.longitude, req.body.latitude],
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
        } else
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
// TRIP Travellers Around My Destination
//**************************************

// Returns the travellers that are around the user
app.get('/tripRequest/travellers', auth, function (req, res)
{
    console.log("\nTrip Request Fetch Travellers\n");
    var connectedUser = basicAuth(req);
    User.findOne({'email': connectedUser.name}, 'destination', function (err, user)
    {
        if (err)
        {
            res.status(500).send('Server Internal Error');
        } else
        {
            // console.log(user);
            // limit results
            var limit = 10;


            // Convert the distance to radians
            // Radius of Earth is approximately 6371 kilometers
            var earthRadiusConstant = 6371;
            // Filter Users with distance less than 500m
            var highProximityDistance = 1 / earthRadiusConstant;
            var mediumProximityDistance = 2 / earthRadiusConstant;
            var lowProximityDistance = 5 / earthRadiusConstant;

            // find a location
            User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $maxDistance: highProximityDistance}, 'email': {$ne: connectedUser.name}, 'statusMode': {$eq: 2}}, "username email location destination imageUrl").limit(limit).sort().exec(function (err, highProxDestinations)
            {
                if (err)
                {
                    res.status(500).send('Server Internal Error');
                }
                User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $minDistance: highProximityDistance, $maxDistance: mediumProximityDistance}, 'email': {$ne: connectedUser.name}, 'statusMode': {$eq: 2}}, "username email location destination imageUrl").limit(limit).sort().exec(function (err, medProxDestinations)
                {
                    if (err)
                    {
                        res.status(500).send('Server Internal Error');
                    }
                    User.find({'destination.coordinates': {$nearSphere: [user.destination.coordinates[0], user.destination.coordinates[1]], $minDistance: mediumProximityDistance, $maxDistance: lowProximityDistance}, 'email': {$ne: connectedUser.name}, 'statusMode': {$eq: 2}}, "username email location destination imageUrl").limit(limit).sort().exec(function (err, lowProxDestinations)
                    {
                        if (err)
                        {
                            res.status(500).send('Server Internal Error');
                        }

                        //I think 10 of each category is wrong...
                        //I think we should take only 10-15 nearest...
                        var jsonToReturn = {
                            "0": highProxDestinations,
                            "1": medProxDestinations,
                            "2": lowProxDestinations
                        };
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
    TripRequest.find({$or: [{'from': user.name}, {'to': user.name}]}, 'From', function (err, inTripRequest)
    {
        console.log("In Trip Request" + inTripRequest);
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
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
                        } else
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
                                    if (i === numOfTravellers - 1)
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
                                            } else
                                            {
                                                res.status(500).send('Server Internal Error');
                                            }
                                        });
                                    }
                                });
                            } else
                            {
                                console.log('TripRequest was insuccessful!');
                            }
                        }
                    });
                }
            } else
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
    TripRequest.find({'to': user.name, 'statusMode': {$ne: 2}}, 'from', function (err, creatorOfTripRequest)
    {
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
        {
            if (creatorOfTripRequest.length)
            {
                // Check if the request is not already rejected
                TripRequest.find({'from': creatorOfTripRequest[0].from, 'statusMode': {$ne: 2}}, 'to', function (err, invitedInTripRequest)
                {
                    if (err)
                    {
                        res.status(500).send('Server Internal Error');
                    } else
                    {
                        if (invitedInTripRequest.length) {
                            console.log(invitedInTripRequest.length);
                            var coTravellers = [];
                            for (var i = 0; i < invitedInTripRequest.length; i++)
                            {
                                if (invitedInTripRequest[i].to !== user.name)
                                {
                                    coTravellers.push(invitedInTripRequest[i].to);
                                }
                            }

                            console.log(coTravellers)

                            //get the creator
                            User.find({'email': creatorOfTripRequest[0].from}, function (err, creator) {
                                if (err) {
                                    res.status(500).send('Server Internal Error');
                                } else {
                                    if (creator.length !== 0) {
                                        console.log(creator)
                                        //get other users
                                        User.find({'email': {$in: coTravellers}}, function (err, usersInTrip) {
                                            if (err) {
                                                res.status(500).send('Server Internal Error');
                                            } else {
                                                if (usersInTrip.length !== 0) {
                                                    //update my mode put in Trip
                                                    res.json(creator.concat(usersInTrip));
                                                }
                                                else
                                                {
                                                    res.json(creator)
                                                }
                                            }
                                        });

                                    }
                                }
                            });



                        } else
                        {
                            res.json({message: "The trip was cancelled!"});
                        }
                    }
                });
            } else
            {
                console.log("No Invitations Yet");
                res.json({message: "No invitations yet!"});
            }
        }
    });
});


//**************************************
// Refresh Status
//**************************************
app.get('/tripRequest/refresh/status', auth, function (req, res)
{
    console.log("Enter refresh/status...");      // your JSON
    var user = basicAuth(req);

    //Check who send the request (Creator - Traveller)
    TripRequest.find({'from': user.name}, 'to statusMode', function (err, isCreatorOfTripRequest)
    { // If I am the creator then give me the not rejected travellers
        if (err)
        {
            res.status(500).send('Server Internal Error');
        } else
        {

//-------------------------------------------------------------
// If I am the Creator of the trip!
//-------------------------------------------------------------
            if (isCreatorOfTripRequest.length > 0)
            {
                console.log("Enter creator refresh status...");

                //1a found travellers
                //create TravellerStatus
                console.log(isCreatorOfTripRequest);
                var travellerStatus = {};
                var sum = 0;
                var statusMode = [];
                var travellerEmail = [];

                for (var i = 0; i < isCreatorOfTripRequest.length; i++)
                {

                    travellerStatus[isCreatorOfTripRequest[i].to] = isCreatorOfTripRequest[i].statusMode;
                    sum += isCreatorOfTripRequest[i].statusMode;
                    travellerEmail[i] = isCreatorOfTripRequest[i].to;
                    statusMode[i] = 1;
                }

                // travellerStatus - [User Email: User Status in Trip Request ( Accepted, Rejected, waiting)]
                //sum - Use it to check if the Travel shall begin
                //traveller e-mail: Emails of the users that have not responded false


                //-------------------------------------------------------------
                // Trip Shall Begin
                //-------------------------------------------------------------
                if (sum === isCreatorOfTripRequest.length)
                {
                    console.log("Creator: the trip must begin...");
                    //build a trip

                    var longitude = 0;
                    var latitude = 0;
                    User.find({'email': {"$in": travellerEmail.concat(user.name)}}, 'location', function (err, travellersLocation)
                    {
                        if (err)
                        {
                            console.log(err);
                            res.status(500).send('Server Internal Error');
                        } else
                        {
                            if (travellersLocation.length > 0)
                            {
                                for (var i = 0; i < travellersLocation.length; i++)
                                {
                                    longitude += travellersLocation[i].location[0];
                                    latitude += travellersLocation[i].location[1];
                                }
                                longitude = longitude / travellersLocation.length;
                                latitude = latitude / travellersLocation.length;
                                console.log("Creator: creating the trip...");

                                var newTrip = new Trip({creator: user.name, travellers: travellerEmail, statusMode: statusMode, meetingPoint: [longitude, latitude]});
                                newTrip.save(function (err)
                                {
                                    if (err)
                                    {
                                        console.log(err);
                                        res.status(500).send('Server Internal Error');
                                    } else
                                    {
                                        //delete ths request?

                                        console.log("Creator: remove the trip requests...");

                                        TripRequest.remove({from: user.name}, function (err, removedTripRequests)
                                        {
                                            if (err)
                                            {
                                                res.status(500).send('Server Internal Error');
                                            } else
                                            {
                                                if (removedTripRequests.result.n > 0)
                                                {
                                                    console.log("Creator: update the users mode status (mine and cotravellers)...");
                                                    User.update({'email': {"$in": travellerEmail.concat(user.name)}}, {$set: {'statusMode': 4}}, {multi: true}, function (err, usersUpdated)
                                                    {

                                                        if (err)
                                                        {
                                                            res.status(500).send('Server Internal Error');
                                                        } else
                                                        {
                                                            if (usersUpdated.nModified > 0)
                                                            {

                                                                console.log(travellerStatus);
                                                                //Trip Has Started
                                                                res.json({"tripStatus": 1, "travellerStatus": travellerStatus});
                                                                console.log("\nUser status: in trip (" + user.name + ")\n");
                                                            } else
                                                            {
                                                                res.status(401).send('User not found!');
                                                            }
                                                        }
                                                    });
                                                    console.log("Removed Trip requests Successfully");

                                                } else
                                                {
                                                    res.status(401).send('trip requests not found!');
                                                }
                                            }
                                        });
                                    }
                                });

                            } else
                            {
                                res.status(401).send('User not found!');
                            }
                        }
                    });

                }
                else if (sum === 2 * isCreatorOfTripRequest.length)
                {
                    console.log("Creator: The trip was cancelled because everyone reject the invitation...");
                    console.log("Creator: Revmove the trip requests...");

                    TripRequest.remove({from: user.name}, function (err, removedTripRequests)
                    {
                        if (err)
                        {
                            res.status(500).send('Server Internal Error');
                        } else
                        {
                            if (removedTripRequests.result.n > 0)
                            {
                                console.log("Creator: update my user mode status...");

                                User.update({'email': user.name}, {$set: {'statusMode': 2}}, function (err, usersUpdated)
                                {
                                    if (err)
                                    {
                                        res.status(500).send('Server Internal Error');
                                    } else
                                    {
                                        if (usersUpdated)
                                        {
                                            res.json({"tripStatus": 2, "travellerStatus": {"": 0}});
                                            console.log("\nUser status: has destination (" + user.name + ")\n");
                                        } else
                                        {
                                            res.status(401).send('User not found!');
                                        }
                                    }
                                });
                                console.log("Removed Trip requests Successfully");
                            } else
                            {
                                res.status(401).send('trip requests not found!');
                            }
                        }
                    });

                } else
                {
                    console.log("Creator: The trip is pending...");

                    res.json({"tripStatus": 0, "travellerStatus": travellerStatus});
                }
            }
//-------------------------------------------------------------
// I am not the Creator!!!
//-------------------------------------------------------------
            else
            {
                console.log("Enter traveller refresh status...");
                //Fetch my Trip Request (only if I had accept the trip request)
                TripRequest.find({'to': user.name, statusMode: {$eq: 1}}, 'from statusMode', function (err, myTripRequest)
                {
                    if (err)
                    {
                        console.log(err);
                        res.status(500).send('Server Internal Error');
                    } else
                    {

                        // if I exist in trip request table then I will get the status of all the other travellers!!
                        if (myTripRequest.length > 0)
                        {
                            console.log("Traveller:I was found in trip request table...");

                            TripRequest.find({'from': myTripRequest[0].from}, 'to statusMode', function (err, invitedInTripRequest)
                            {

                                if (err)
                                {
                                    res.status(500).send('Server Internal Error');
                                } else
                                {
                                    //creator of trip Request
                                    var travellerStatus = {};
                                    travellerStatus[myTripRequest[0].from] = 1;

                                    //IF there are at lest two persons in the trip request (1 Co-Traveller)!
                                    if (invitedInTripRequest.length > 0)
                                    {
                                        console.log("Traveller: Cotravellers found in trip-request table...(at least is only me)");
                                        //create Travellers!
                                        var sum = 0;
                                        var statusMode = [];
                                        var travellerEmail = [];
                                        for (var i = 0; i < invitedInTripRequest.length; i++)
                                        {
                                            if (invitedInTripRequest[i].to !== user.name)
                                            {
                                                travellerStatus[invitedInTripRequest[i].to] = invitedInTripRequest[i].statusMode;
                                            }
                                            sum += invitedInTripRequest[i].statusMode;
                                            travellerEmail[i] = invitedInTripRequest[i].to;
                                            statusMode[i] = 1;
                                        }
                                        if (sum === invitedInTripRequest.length)
                                        {
                                            console.log("Traveller: the trip must begin...");

                                            //get the location of the rest of the travellers and the cretor so as to compute the meeting point
                                            User.find({'email': {"$in": travellerEmail.concat(myTripRequest[0].from)}}, 'location', function (err, travellersLocation)
                                            {
                                                if (err)
                                                {
                                                    console.log(err);
                                                    res.status(500).send('Server Internal Error');
                                                } else
                                                {
                                                    if (travellersLocation.length > 0)
                                                    {
                                                        var longitude = 0;
                                                        var latitude = 0;
                                                        for (var i = 0; i < travellersLocation.length; i++)
                                                        {
                                                            longitude += travellersLocation[i].location[0];
                                                            latitude += travellersLocation[i].location[1];
                                                        }
                                                        longitude = longitude / travellersLocation.length;
                                                        latitude = latitude / travellersLocation.length;

                                                        //build a trip
                                                        console.log("Traveller: Creating the trip...");

                                                        var newTrip = new Trip({creator: myTripRequest[0].from, travellers: travellerEmail, statusMode: statusMode, meetingPoint: [longitude, latitude]});
                                                        newTrip.save(function (err)
                                                        {
                                                            if (err)
                                                            {
                                                                console.log(err);
                                                                res.status(500).send('Server Internal Error');
                                                            } else
                                                            {
                                                                //delete ths request?
                                                                console.log("Traveller: Removing trip request from the table...");
                                                                TripRequest.remove({from: myTripRequest[0].from}, function (err, removedTripRequests)
                                                                {
                                                                    if (err)
                                                                    {
                                                                        res.status(500).send('Server Internal Error');
                                                                    } else
                                                                    {
                                                                        if (removedTripRequests.result.n > 0)
                                                                        {
                                                                            User.update({'email': {"$in": [travellerEmail, myTripRequest[0].from]}}, {$set: {'statusMode': 4}}, {multi: true}, function (err, usersUpdated)
                                                                            {
                                                                                if (err)
                                                                                {
                                                                                    res.status(500).send('Server Internal Error');
                                                                                } else
                                                                                {
                                                                                    if (usersUpdated.nModified > 0)
                                                                                    {
                                                                                        res.json({"tripStatus": 1, "travellerStatus": travellerStatus});
                                                                                        console.log("\nUser status: in trip (" + user.name + ")\n");
                                                                                    } else
                                                                                    {
                                                                                        res.status(401).send('User not found!');
                                                                                    }
                                                                                }
                                                                            });
                                                                            console.log("Traveller: Removed Trip requests Successfully");
                                                                        } else
                                                                        {
                                                                            res.status(401).send('trip requests not found!');
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                        });

                                                    } else
                                                    {
                                                        res.status(401).send('User not found!');
                                                    }
                                                }
                                            });

                                        } else
                                        {
                                            console.log("Step11");
                                            res.json({"tripStatus": 0, "travellerStatus": travellerStatus});
                                        }
                                    } else //if nobody found, maybe somebody already in trip??? just checking...
                                    {
                                        console.log("Traveller: Not found in trip request...");

                                        Trip.find({'travellers': user.name}, 'travellers creator', function (err, alreadyInTrip)
                                        {
                                            if (err)
                                            {
                                                console.log(err);
                                                res.status(500).send('Server Internal Error');
                                            } else
                                            {
                                                if (alreadyInTrip.length > 0)
                                                {
                                                    console.log("Traveller: Found in trip...");

                                                    var travellerStatus = {};
                                                    travellerStatus[alreadyInTrip[0].creator] = 1;

                                                    for (var i = 0; i < alreadyInTrip[0].length; i++)
                                                    {
                                                        if (alreadyInTrip[0].travellers[i] !== user.name)
                                                        {
                                                            //put by default 1 because the travellers inside a trip, had previously accepted the triprequest
                                                            travellerStatus[alreadyInTrip[0].travellers[i]] = 1;
                                                        }
                                                    }
                                                    res.json({"tripStatus": 1, "travellerStatus": travellerStatus});
                                                } else
                                                {
                                                    console.log("Traveller: not Found nowhere... The trip had probably been cancelled");

                                                    res.json({"tripStatus": 2, "travellerStatus": {"": 0}});
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                        //I am not in trip request table (neither as creator nor as traveller), i.e. check in the trip table.
                        else
                        {
                            Trip.find({'creator': user.name}, 'travellers', function (err, alreadyInTrip)
                            {
                                if (err)
                                {
                                    res.status(500).send('Server Internal Error');
                                } else
                                {
                                    if (alreadyInTrip.length > 0)
                                    {
                                        console.log("Creator: I am in the trip table... Informed last...");

                                        var travellerStatus = {};
                                        for (var i = 0; i < alreadyInTrip[0].travellers.length; i++)
                                        {
                                            //put by default 1 because the travellers inside a trip, had previously accepted the triprequest
                                            travellerStatus[alreadyInTrip[0].travellers[i]] = 1;
                                        }
                                        res.json({"tripStatus": 1, "travellerStatus": travellerStatus});
                                    }
                                    else
                                    {
                                        //here we enter if traveller was not found previously in trip request,
                                        Trip.find({'travellers': user.name}, 'travellers', function (err, travellersInTrip)
                                        {
                                            if (err)
                                            {
                                                console.log(err);
                                                res.status(500).send('Server Internal Error');
                                            }
                                            else
                                            {
                                                if (travellersInTrip.length > 0)
                                                {
                                                    console.log("Traveller: I am in the trip table... Informed last...");
                                                    var travellerStatus = {};
                                                    for (var i = 0; i < travellersInTrip[0].travellers.length; i++)
                                                    {
                                                        //put by default 1 because the travellers inside a trip, had previously accepted the triprequest
                                                        travellerStatus[travellersInTrip[0].travellers[i]] = 1;
                                                    }
                                                    res.json({"tripStatus": 1, "travellerStatus": travellerStatus});
                                                }
                                                else
                                                {
                                                    console.log("Traveller or Creator: Nowhere... Trip cancelled");

                                                    res.json({"tripStatus": 2, "travellerStatus": {"": 0}});

                                                }
                                            }
                                        });
                                    }
                                }

                            });
                        }
                    }
                });
            }
        }
    });
});


//**************************************
// Response Trip Request-can be posted only by coTravellers
//**************************************
app.post('/tripRequest/response', auth, function (req, res)
{
    console.log(req.body);
    var user = basicAuth(req);

    var parsedResponse = 1;
    if (!req.body.response)
    {
        parsedResponse = 2;
    }
    TripRequest.update({'to': user.name}, {$set: {'statusMode': parsedResponse}}, function (err, tripRequestUpdated)
    {
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
        {
            //If the tripRequest of the cotraveller was updated, it means that the trip had not been cancelled.
            //is this correct?? UPDATE is not FIND query...
            if (tripRequestUpdated)
            {
                console.log('Response: ' + parsedResponse);
                //if the cootraveller accepts, we must update their staus mode in usr database as in trip request...
                //else do nothing more
                if (parsedResponse === 1)
                {
                    User.update({'email': user.name}, {$set: {'statusMode': 3}}, function (err, userUpdated)
                    {
                        if (err)
                        {
                            res.status(500).send('Server Internal Error');
                        } else
                        {
                            if (userUpdated)
                            {
                                console.log("\nUser status: in trip request (" + user.name + ")\n");
                            } else
                            {
                                res.status(401).send('User not found!');
                            }
                        }
                    });
                }
                res.send("Success");

            } else //if there was not found any trip request the trip probably was cancelled or already began without him...
            {
                res.json({"tripStatus": 2});
            }
        }
    });
});


//**************************************
// CancelTrip Request (tripCreator(cancel the trip) - cotraveller(cancel its participation into te trip))
//**************************************
app.get('/tripRequest/cancel', auth, function (req, res)
{
    console.log(req.body);
    var user = basicAuth(req);

    TripRequest.find({'from': user.name, 'statusMode': {$ne: 2}}, 'to statusMode', function (err, isCreatorOfTripRequest)
    {
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
        {
            if (isCreatorOfTripRequest.length === 0)
            {
                TripRequest.update({'to': user.name}, {$set: {'statusMode': 2}}, function (err, tripRequestCancelled)
                {
                    if (err)
                    {
                        console.log(err);
                        res.status(500).send('Server Internal Error');
                    } else
                    {
                        //If the tripRequest of the cotraveller was cancelled successfully, it means that the trip had not been cancelled.
                        //is this correct?? UPDATE is not FIND query...
                        if (tripRequestCancelled)
                        {
                            console.log('Traveller: Cancelled response...');
                            //if the cootraveller cancels, we must update their staus mode in usr database...
                            //else do nothing more

                            User.update({'email': user.name}, {$set: {'statusMode': 2}}, function (err, userUpdated)
                            {
                                if (err)
                                {
                                    res.status(500).send('Server Internal Error');
                                } else
                                {
                                    if (userUpdated)
                                    {
                                        res.send("Success");
                                        console.log("\nUser status: has destination (" + user.name + ")\n");
                                    } else
                                    {
                                        res.status(401).send('User not found!');
                                    }
                                }
                            });
                        } else //if there was not found any trip request the trip probably was already cancelled or had already began without him...
                        {
                            res.send("Success");
                        }
                    }
                });
            } else //must remove trip-requests, the trip is cancelled by the creator
            {
                var emails = [];
                for (var i = 0; i < isCreatorOfTripRequest.length; i++)
                {
                    emails[i] = isCreatorOfTripRequest[i].to;
                }
                TripRequest.remove({from: user.name}, function (err, removedTripRequests)
                {
                    if (err)
                    {
                        res.status(500).send('Server Internal Error');
                    } else
                    {

                        if (removedTripRequests.result.n > 0)
                        {
                            console.log(emails.concat(user.name));
                            User.update({'email': {"$in": emails.concat(user.name)}}, {$set: {'statusMode': 2}}, {multi: true}, function (err, userUpdated)
                            {
                                if (err)
                                {
                                    res.status(500).send('Server Internal Error');
                                } else
                                {
                                    console.log(userUpdated);
                                    if (userUpdated.nModified > 0)
                                    {
                                        res.send("Success");
                                        console.log("\nUser status: has destination (" + emails.concat(user.name) + ")\n");
                                    } else
                                    {
                                        res.status(401).send('User not found!');
                                    }
                                    console.log("Creator: Cancelled Trip Successfully");
                                }
                            });
                        } else
                        {
                            // res.status(401).send('trip requests not found!');
                            res.send("Success");
                        }
                    }
                });
            }
        }
    });
});




//**************************************
// TRIP
//**************************************

//**************************************
// TRIP Init
//**************************************

app.get('/trip/init', auth, function (req, res)
{
    console.log(req.body);
    var user = basicAuth(req);

    Trip.find({'creator': user.name}, 'meetingPoint', function (err, isCreatorOfTrip)
    {
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
        {
            if(isCreatorOfTrip.length)
            {
                console.log("Return Meeting Point for Creator")
                //return meeting point
                res.json({"meetingPoint": isCreatorOfTrip[0].meetingPoint})
            }
            else
            {
                Trip.find({'travellers': user.name}, 'meetingPoint', function (err, isTraveller)
                {
                    if (err)
                    {
                        console.log(err);
                        res.status(500).send('Server Internal Error');
                    } else
                    {
                        if(isTraveller.length)
                        {
                            console.log("Return Meeting Point for Traveller")
                            //return meeting point
                            res.json({"meetingPoint": isTraveller[0].meetingPoint})
                        }
                        else
                        {
                            res.json({"message": "You are not included inside a Trip"})
                        }

                    }
                });
            }
        }
    });
});


//**************************************
// TRIP - Fetch Travellers
//**************************************
app.get('/trip/travellers', auth, function (req, res)
{
    console.log(req.body);
    var user = basicAuth(req);

    console.log("TEST____________");
    Trip.find({$or: [{'creator': user.name}, {'travellers': user.name, 'statusMode': {$eq: 1}}]}, 'creator travellers', function (err, coTravellers)
    {
        if (err)
        {
            console.log(err);
            res.status(500).send('Server Internal Error');
        } else
        {
            if(coTravellers.length)
            {
                var myTravellers = [];
                if (coTravellers[0].creator !== user.name) {
                    myTravellers = [coTravellers[0].creator];
                }

                for (var i = 0; i < coTravellers[0].travellers.length; i++)
                {
                    if(coTravellers[0].travellers[i] !== user.name)
                    {
                        myTravellers.push(coTravellers[0].travellers[i]);
                    }
                }

                console.log("TEST____________My Travellers"+myTravellers);
                //get User Objects

                User.find({'email': {$in: myTravellers}}, function (err, users)
                {
                    if (err)
                    {
                        console.log(err);
                        res.status(500).send('Server Internal Error');
                    }
                    else{
                        console.log(users);
                        res.json(users);
                    }
                });

            }
            else
            {
                res.json({"message": "We could not find andy co Travelers for you"});
            }
        }
    });
});

//Create Server

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
