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
			console.log('Basic Auth: Authorized');
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
						res.json({success: "User Registration Successful"});
					}
				});
			}
		}
	});
});



//**************************************
//
//**************************************
// Login User
app.post('/login', function (req, res) {
	console.log(req.body);      // your JSON

	User.findOne({ 'email': req.body.email }, 'username imageUrl password secretToken', function (err, user) {
  		if (err) {
  			console.log(err)
			res.status(500).send('Server Internal Error')
  		}
  		else {
            if (!user){
                res.json({message: "Invalid Username or Password"})
            }
            else {
                console.log('LOGIN: found.user')

                res.setHeader('Content-Type', 'application/json');

                if (req.body.password != user.password) {
                    res.json({message: "Invalid Username or Password"})
                } else {
                    var jsonToReturn = {token: user.secretToken,
                        username: user.username,
                        imageUrl: user.imageUrl};
                    console.log(jsonToReturn)
                    res.json(jsonToReturn);

                    console.log("LOGIN: Valid User")
                }
            }
        }
	})
});


//**************************************
//
//**************************************
// Update the location of a specific user
app.post('/location', auth, function (req, res) {
    // If internal error in Saving or whatever
    // res.status(500).send('Server Internal Error')
    // If everything is successful
    // res.send("<html><body><h1>Post Location was Successful</h1></body></html>");
	console.log(req.body);
    res.send("<html><body><h1>Post Location was Successful</h1></body></html>");

});


// Returns the travellers that are around the user
app.get('/travellers', auth, function (req, res) {
    console.log(req.body)
    var jsonToReturn = [{
        username: "Thanasis",
        address: "Ikoniou 4",
        region: "Nikaia",
        currentLatitude: 37.983709,
        currentLongitude: 23.680877,
        destinationLatitude: 37.997272,
        destinationLongitude:23.686664,
        extraPersons: 2,
		imageUrl: "photo1.jpg"
    },
    {
        username: "Alexis",
        address: "Argirokastrou",
        region: "Aigaleo",
        currentLatitude: 37.984470,
        currentLongitude: 23.680367,
        destinationLatitude: 37.997272,
        destinationLongitude:23.686664,
        extraPersons: 2,
		imageUrl: "photo2.jpg"
    }];
    res.json(jsonToReturn)

    // If username exists then return that
    // res.json({message: "Username already Exists"});
    // If internal error in Saving or whatever
    // res.status(500).send('Server Internal Error')
});



// Update the location of a specific user
app.post('/destination', auth, function (req, res) {
	console.log(req.body);
	// res.send("<html><body><h1>Post Destination</h1></body></html>");
	res.json({"OK": "Insert of Destination was successful"});

    // If username exists then return that
    // res.json({message: "Username already Exists"});
    // If internal error in Saving or whatever
    //res.status(401).send('Server Internal Error')
});





//Create Server

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
