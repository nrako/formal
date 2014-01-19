/*!
 * Module dependencies.
 */

var Field = require('./field'),
  inherits = require('inherits'),
  CastError = Field.CastError,
  Types = {
    Boolean: require('./boolean'),
    Date: require('./date'),
    Number: require('./number'),
    String: require('./string')
  };

/**
 * Array Field constructor
 *
 * @param {String} key
 * @param {Field} cast
 * @param {Object} options
 * @inherits Field
 * @api private
 */

function FieldArray (key, cast, options) {
  if (cast) {
    var castOptions = {};

    // support { type: 'String' }
    var name = 'string' == typeof cast ? cast : cast.name;

    var Caster = name in Types ? Types[name] : cast;

    this.casterConstructor = Caster;
    this.caster = new Caster(null, castOptions);
  }

  Field.call(this, key, options);

  var self = this,
    defaultArr, fn;

  if (this.defaultValue) {
    defaultArr = this.defaultValue;
    fn = 'function' == typeof defaultArr;
  }

  this.default(function(){
    var arr = fn ? defaultArr() : defaultArr || [];
    return arr;
  });
}

/*!
 * Inherits from Field.
 */

inherits(FieldArray, Field);

/**
 * Check required
 *
 * @param {Array} value
 * @api private
 */

FieldArray.prototype.checkRequired = function (value) {
  return !!(value && value.length);
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

FieldArray.prototype.applyGetters = function (value, scope) {
  if (this.caster.options && this.caster.options.ref) {
    // means the object id was populated
    return value;
  }

  return Field.prototype.applyGetters.call(this, value, scope);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Form} form that triggers the casting
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */

FieldArray.prototype.cast = function (value, form, init) {
  if (Array.isArray(value)) {

    if (this.caster) {
      try {
        for (var i = 0, l = value.length; i < l; i++) {
          value[i] = this.caster.cast(value[i], form, init);
        }
      } catch (e) {
        // rethrow
        throw new CastError(e.type, value, this.path);
      }
    }

    return value;
  } else {
    return this.cast([value], form, init);
  }
};

/*!
 * Module exports.
 */

module.exports = FieldArray;
