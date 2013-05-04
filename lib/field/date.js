/*!
 * Module requirements.
 */

var Field = require('./field'),
    util = require('util'),
    CastError = Field.CastError;

/**
 * Date Field constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits Field
 * @api private
 */

function FieldDate (key, options) {
  Field.call(this, key, options);
}

/*!
 * Inherits from Field.
 */

util.inherits(FieldDate, Field);

/**
 * Required validator for date
 *
 * @api private
 */

FieldDate.prototype.checkRequired = function (value) {
  return value instanceof Date;
};

/**
 * Casts to date
 *
 * @param {Object} value to cast
 * @api private
 */

FieldDate.prototype.cast = function (value) {
  if (value === null || value === '')
    return null;

  if (value instanceof Date)
    return value;

  var date;

  // support for timestamps
  if (value instanceof Number || 'number' == typeof value || String(value) == Number(value))
    date = new Date(Number(value));

  // support for date strings
  else if (value.toString)
    date = new Date(value.toString());

  if (date.toString() != 'Invalid Date')
    return date;

  throw new CastError('date', value, this.path);
};

FieldDate.prototype.export = function() {
  FieldDate.super_.prototype.export.call(this);

  var attr = this.options.attributes || (this.options.attributes = {});

  attr.type = 'date';

  return this.options;
};


/*!
 * Module exports.
 */

module.exports = FieldDate;
