/*!
 * Module dependencies.
 */
var util = require('util'),
    FormalError = require('../error');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits FormalError
 * @api private
 */

function CastError (type, value, path) {
  FormalError.call(this, 'Cast to ' + type + ' failed for value "' + value + '" at path "' + path + '"');
  Error.captureStackTrace(this, CastError);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
  this.path = path;
}

/*!
 * Inherits from FormalError.
 */

util.inherits(CastError, FormalError);

/*!
 * exports
 */

module.exports = CastError;
