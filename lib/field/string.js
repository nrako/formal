/* jshint laxbreak: true, boss: true, bitwise: false */
/*!
 * Module dependencies.
 */

var Field = require('./field'),
    CastError = Field.CastError,
    utils = require('../utils'),
    Document;

/**
 * String Field constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits Field
 * @api private
 */

function FieldString (key, options) {
  this.enumValues = [];
  this.regExp = null;
  Field.call(this, key, options, 'String');
}

/*!
 * Inherits from Field.
 */

FieldString.prototype = Object.create(Field.prototype);

/**
 * Adds enumeration values and a coinciding validator.
 *
 * ####Example:
 *
 *     var states = 'opening open closing closed'.split(' ')
 *     var f = new Form({ state: { type: String, enum: states })
 *     app.post('/url', f, function (req, res) {
 *       if (!req.form.isValid())
 *         console.error(req.form.errors);
 *     });
 *
 * @param {String} [args...] enumeration values
 * @api public
 */

FieldString.prototype.enum = function () {
  var len = arguments.length;
  if (!len || undefined === arguments[0] || false === arguments[0]) {
    if (this.enumValidator){
      this.enumValidator = false;
      this.validators = this.validators.filter(function(v){
        return v[1] != 'enum';
      });
    }
    return;
  }

  for (var i = 0; i < len; i++) {
    if (undefined !== arguments[i]) {
      this.enumValues.push(this.cast(arguments[i]));
    }
  }

  if (!this.enumValidator) {
    var values = this.enumValues;
    this.enumValidator = function(v){
      return undefined === v || ~values.indexOf(v);
    };
    this.validators.push([this.enumValidator, 'enum']);
  }
};

/**
 * Adds a lowercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ email: { type: String, lowercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ email: 'SomeEmail@example.COM' });
 *     console.log(m.email) // someemail@example.com
 *
 * @api public
 */

FieldString.prototype.lowercase = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v);
    if (v) return v.toLowerCase();
    return v;
  });
};

/**
 * Adds an uppercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ caps: { type: String, uppercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ caps: 'an example' });
 *     console.log(m.caps) // AN EXAMPLE
 *
 * @api public
 */

FieldString.prototype.uppercase = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v);
    if (v) return v.toUpperCase();
    return v;
  });
};

/**
 * Adds a trim setter.
 *
 * The string value will be trimmed when set.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, trim: true }})
 *     var M = db.model('M', s)
 *     var string = ' some name '
 *     console.log(string.length) // 11
 *     var m = new M({ name: string })
 *     console.log(m.name.length) // 9
 *
 * @api public
 */

FieldString.prototype.trim = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v);
    if (v) return v.trim();
    return v;
  });
};

/**
 * Sets a regexp validator.
 *
 * Any value that does not pass `regExp`.test(val) will fail validation.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, match: /^a/ }})
 *     var M = db.model('M', s)
 *     var m = new M({ name: 'invalid' })
 *     m.validate(function (err) {
 *       console.error(err) // validation error
 *       m.name = 'apples'
 *       m.validate(function (err) {
 *         assert.ok(err) // success
 *       })
 *     })
 *
 * @param {RegExp} regExp regular expression to test against
 * @api public
 */

FieldString.prototype.match = function match (regExp) {
  this.validators.push([function(v){
    return null != v && '' !== v
      ? regExp.test(v)
      : true;
  }, 'regexp']);
};

/**
 * Check required
 *
 * @param {String|null|undefined} value
 * @api private
 */

FieldString.prototype.checkRequired = function checkRequired (value, doc) {
  return (value instanceof String || typeof value == 'string') && value.length;
};

/**
 * Casts to String
 *
 * @api private
 */

FieldString.prototype.cast = function (value, doc, init) {
  if (value === null) {
    return value;
  }

  if ('undefined' !== typeof value) {
    // handle documents being passed
    if (value._id && 'string' == typeof value._id) {
      return value._id;
    }
    if (value.toString) {
      return value.toString();
    }
  }


  throw new CastError('string', value, this.path);
};

/*!
 * Module exports.
 */

module.exports = FieldString;
