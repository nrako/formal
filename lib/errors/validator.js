/*!
 * Module dependencies.
 */

var ConformError = require('../error'),
    util = require('util');

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} msg
 * @param {String|Number|any} val
 * @inherits ConformError
 * @api private
 */

function ValidatorError (path, type, val) {
  var msg = type ? '"' + type + '" ' : '';

  var message = 'Validator ' + msg + 'failed for path ' + path;
  if (2 < arguments.length) message += ' with value `' + String(val) + '`';

  ConformError.call(this, message);
  Error.captureStackTrace(this, ValidatorError);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
  this.value = val;
}

/*!
 * Inherits from ConformError
 */

util.inherits(ValidatorError, ConformError);

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function () {
  return this.message;
};


/*!
 * exports
 */

module.exports = ValidatorError;
