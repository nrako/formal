
/*!
 * Module requirements
 */

var ConformError = require('../error'),
    util = require('util');

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits ConformError
 */

function ValidationError (instance) {
  ConformError.call(this, 'Validation failed');
  Error.captureStackTrace(this, ValidationError);
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
}

/**
 * Console.log helper
 */

ValidationError.prototype.toString = function () {
  var ret = this.name + ': ';
  var msgs = [];

  Object.keys(this.errors).forEach(function (key) {
    if (this == this.errors[key]) return;
    msgs.push(String(this.errors[key]));
  }, this);

  return ret + msgs.join(', ');
};

/*!
 * Inherits from ConformError.
 */

util.inherits(ValidationError, ConformError);

/*!
 * Module exports
 */

module.exports = exports = ValidationError;
