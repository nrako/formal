/* jshint -W053 */
/*!
 * Module requirements.
 */

var Field = require('./field'),
    util = require('util'),
    CastError = Field.CastError,
    Document;

/**
 * Number Field constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits Field
 * @api private
 */

function FieldNumber (key, options) {
  Field.call(this, key, options, 'Number');
}

/*!
 * Inherits from Field.
 */

util.inherits(FieldNumber, Field);

/**
 * Required validator for number
 *
 * @api private
 */

FieldNumber.prototype.checkRequired = function checkRequired (value, doc) {
  return typeof value == 'number' || value instanceof Number;
};

/**
 * Sets a minimum number validator.
 *
 * ####Example:
 *
 *     var form = new Form({
 *       age: {
 *         type: Number,
 *         min: 18
 *       }
 *     });
 *
 *     form.set('age', 17);
 *
 *     form.validate(console.log);
 *
 * @param {Number} value minimum number
 * @param {String} message
 * @api public
 */

FieldNumber.prototype.min = function (value, message) {
  if (this.minValidator) {
    delete this.options.min;
    this.validators = this.validators.filter(function(v){
      return v[1] != 'min';
    });
  }
  if (value != null) {
    this.validators.push([this.minValidator = function(v){
      return v === null || v >= value;
    }, 'min']);
    this.options.min = value;
  }
  return this;
};

/**
 * Sets a maximum number validator.
 *
 * ####Example:
 *
 *     var form = new Form({
 *       price: Number
 *     });
 *
 *     form.path('price').max(100000000, 'Price is too high, well... really?');
 *
 *     form.validate(console.log);
 *
 * @param {Number} maximum number
 * @param {String} message
 * @api public
 */

FieldNumber.prototype.max = function (value, message) {
  if (this.maxValidator) {
    this.maxValue = null;
    this.validators = this.validators.filter(function(v){
      return v[1] != 'max';
    });
  }
  if (value != null) {
    this.validators.push([this.maxValidator = function(v){
      return v === null || v <= value;
    }, 'max']);
    this.maxValue = value;
  }
  return this;
};

/**
 * Casts to number
 *
 * @param {Object} value value to cast
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

FieldNumber.prototype.cast = function (value, doc, init) {
  var val = value;

  if (!isNaN(val)){
    if (null === val) return val;
    if ('' === val) return null;
    if ('string' == typeof val) val = Number(val);
    if (val instanceof Number) return val;
    if ('number' == typeof val) return val;
    if (val.toString && !Array.isArray(val) &&
        val.toString() == Number(val)) {
      return new Number(val);
    }
  }

  throw new CastError('number', value, this.path);
};

/**
 * Export
 * @return {[type]} [description]
 */
FieldNumber.prototype.export = function() {
  FieldNumber.super_.prototype.export.call(this);

  var attr = this.options.attributes || (this.options.attributes = {});

  attr.type = 'number';

  if (!this.options.min && attr.min)
    delete attr.min;
  if (this.options.min)
    attr.min = this.options.min;

  if (!this.options.max && attr.max)
    delete attr.max;

  if (this.options.max)
    attr.max = this.options.max;

  return this.options;
};

/*!
 * Module exports.
 */

module.exports = FieldNumber;
