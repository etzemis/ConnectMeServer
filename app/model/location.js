
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// Load the model
var Coordinate = require('./coordinate');

//create Coordinate Schema
var coordinateSchema = new Schema({
  latitude: { type: SchemaTypes.Double, required: true },
  longitute: { type: SchemaTypes.Double, required: true }
});
// create a schema
var locationSchema = new Schema({
  address: { type: String, required: true }
  region: { type: String, required: true },
  coordinate: { type: [coordinateSchema], required: true },
  image_url: {type: String}
  address:
});

// the schema is useless so far
// we need to create a model using it
var Location = mongoose.model('location', locationSchema);

// make this available to our users in our Node applications
module.exports = Location;