var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//*********************************
//*** Status Of Trip Request ***
//
//  statusMode 0: not responded
//  statusMode 1: accepted
//  statusMode 2: rejected


// cancelled will be treated as reject!
//
//*********************************
// create a schema
var tripRequestSchema = new Schema({
    from: { type: String, required: true },
    to  : { type: String, required: true},
    statusMode: {type: Number}
});
// the schema is useless so far
// we need to create a model using it
var TripRequest = mongoose.model('tripRequest', tripRequestSchema);
// make this available to our users in our Node applications
module.exports = TripRequest;