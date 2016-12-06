var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//*********Status Of Trip************
//  statusMode 0: not responded
//  statusMode 1: entered trip
//  statusMode 2: abandoned trip
//***********************************

// create a schema
var tripSchema = new Schema({
    travellers: [String],
    statusMode: [Number],
    meetingPoint:
    {
        type: [Number],
        index: '2d'
    }
});

// the schema is useless so far
// we need to create a model using it
var Trip = mongoose.model('trip', tripSchema);
// make this available to
module.exports = Trip;