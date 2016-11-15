
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//var Coordinate = require('./coordinate');
var SchemaTypes = mongoose.Schema.Types;

var coordinateSchema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
});
// create a schema
var userSchema = new Schema({
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
    }
  }
});

// the schema is useless so far
// we need to create a model using it
var User = mongoose.model('user', userSchema);

// make this available to our users in our Node applications
module.exports = User;