
/*!
 * Module requirements
 */

var FormalError = require('../error'),
    inherits = require('inherits');

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits FormalError
 */

function ValidationError (instance) {
  FormalError.call(this, 'Validation failed');
  Error.captureStackTrace(this, ValidationError);
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
}

/*!
 * Inherits from FormalError.
 */

inherits(ValidationError, FormalError);

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
 * Module exports
 */

module.exports = exports = ValidationError;
