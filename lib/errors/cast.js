/*!
 * Module dependencies.
 */
var util = require('util'),
    ConformError = require('../error');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits ConformError
 * @api private
 */

function CastError (type, value, path) {
  ConformError.call(this, 'Cast to ' + type + ' failed for value "' + value + '" at path "' + path + '"');
  Error.captureStackTrace(this, CastError);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
  this.path = path;
}

/*!
 * Inherits from ConformError.
 */

util.inherits(CastError, ConformError);

/*!
 * exports
 */

module.exports = CastError;
