
var util = require('util');
/**
 * FormalError constructor
 *
 * @param {String} msg Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function FormalError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, FormalError);
  this.message = msg;
  this.name = 'FormalError';
}

/*!
 * Inherits from Error.
 */

util.inherits(FormalError, Error);

/*!
 * Module exports.
 */

module.exports = exports = FormalError;

/*!
 * Expose subclasses
 */

FormalError.CastError = require('./errors/cast');
//FormalError.DocumentError = require('./errors/document');
FormalError.ValidationError = require('./errors/validation');
FormalError.ValidatorError = require('./errors/validator');
//FormalError.VersionError =require('./errors/version')
//FormalError.OverwriteModelError = require('./errors/overwriteModel')
//FormalError.MissingSchemaError = require('./errors/missingSchema')
//FormalError.DivergentArrayError = require('./errors/divergentArray')
