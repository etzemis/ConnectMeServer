
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Coordinate = require('./coordinate');

// create a schema
var userSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image_url: {type: String},
  address: {type: String},
  secret_token: {type: String}
});

// the schema is useless so far
// we need to create a model using it
var User = mongoose.model('user', userSchema);

// make this available to our users in our Node applications
module.exports = User;