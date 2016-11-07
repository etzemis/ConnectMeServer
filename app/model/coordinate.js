
var mongoose = require('mongoose');
require('mongoose-double')(mongoose);
var Schema = mongoose.Schema;

var SchemaTypes = mongoose.Schema.Types;
// create a schema
var coordinateSchema = new Schema({
  latitude: { type: SchemaTypes.Double, required: true },
  longitute: { type: SchemaTypes.Double, required: true }
});

// the schema is useless so far
// we need to create a model using it
var Coordinate = mongoose.model('coordinate', coordinateSchema);

// make this available to our users in our Node applications
module.exports = Coordinate;