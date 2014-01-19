/*!
 * Module dependencies.
 */

var inherits = require('inherits'),
    Field = require('./field');

/**
 * Boolean Field constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits Field
 * @api private
 */

function FieldBoolean (path, options) {
  Field.call(this, path, options);
}

/*!
 * Inherits from Field.
 */
inherits(FieldBoolean, Field);

/**
 * Required validator
 *
 * @api private
 */

FieldBoolean.prototype.checkRequired = function (value) {
  return value === true || value === false;
};

/**
 * Casts to boolean
 *
 * @param {Object} value
 * @api private
 */

FieldBoolean.prototype.cast = function (value) {
  if (null === value) return value;
  if ('0' === value) return false;
  if ('true' === value) return true;
  if ('false' === value) return false;
  return !! value;
};

FieldBoolean.prototype.export = function() {
  FieldBoolean.super_.prototype.export.call(this);

  var attr = this.options.attributes || (this.options.attributes = {});

  attr.type = 'checkbox';

  return this.options;
};

/*!
 * Module exports.
 */

module.exports = FieldBoolean;
