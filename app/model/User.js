
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//var Coordinate = require('./coordinate');
var SchemaTypes = mongoose.Schema.Types;


//*********************************
//*** Status Of The User ***
//
//  statusMode O: InActive
//  statusMode 1: Active - Thus Invisible
//  statusMode 2: Has Destination - Visible
//  statusMode 3: In Trip Request
//  statusMode 4: In Trip
//
//*********************************


var coordinateSchema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
});
// create a schema
var userSchema = new Schema({
  statusMode: {type: Number, required: true},
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  imageUrl: {type: String},
  address: {type: String},
  secretToken: {type: String},
  location:
  {
    type: [Number],
    index: '2d'
  },
  destination:
  {
    region: {type: String},
    address: {type: String},
    coordinates:
    {
      type: [Number],
      index: '2d'
    },
    extraPersons: {type: Number}
  }
});

// the schema is useless so far
// we need to create a model using it
var User = mongoose.model('user', userSchema);

// make this available to our users in our Node applications
module.exports = User;