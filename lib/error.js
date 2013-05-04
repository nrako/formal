
var util = require('util');
/**
 * ConformError constructor
 *
 * @param {String} msg Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function ConformError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, ConformError);
  this.message = msg;
  this.name = 'ConformError';
}

/*!
 * Inherits from Error.
 */

util.inherits(ConformError, Error);

/*!
 * Module exports.
 */

module.exports = exports = ConformError;

/*!
 * Expose subclasses
 */

ConformError.CastError = require('./errors/cast');
//ConformError.DocumentError = require('./errors/document');
ConformError.ValidationError = require('./errors/validation');
ConformError.ValidatorError = require('./errors/validator');
//ConformError.VersionError =require('./errors/version')
//ConformError.OverwriteModelError = require('./errors/overwriteModel')
//ConformError.MissingSchemaError = require('./errors/missingSchema')
//ConformError.DivergentArrayError = require('./errors/divergentArray')
