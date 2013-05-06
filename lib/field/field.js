/*!
 * Module dependencies.
 */

var CastError = require('../error').CastError,
    ValidatorError = require('../error').ValidatorError,
    util = require('util'),
    _ = require('lodash'),
    EventEmitter = require('events').EventEmitter;

/**
 * Field constructor
 *
 * @param {String} path
 * @param {Object} [options]
 * @param {String} [instance]
 * @api public
 */

function Field (path, options, instance) {
  this.path = path;
  this.instance = instance;
  this.validators = [];
  this.setters = [];
  this.getters = [];
  this.defaultValue = null;

  this.options = options;

  for (var opt in options)
    if (this[opt] && 'function' == typeof this[opt]) {
      // { unique: true, index: true }
      // if ('index' == opt && this._index) continue;

      var opts = Array.isArray(options[opt]) ? options[opt] : [options[opt]];

      this[opt].apply(this, opts);
    }

  EventEmitter.call(this);
}

util.inherits(Field, EventEmitter);

/**
 * Sets a default value for this Field.
 *
 * ####Example:
 *
 *     var field = new Field({ n: { type: Number, default: 10 })
 *     var M = db.model('M', field)
 *     var m = new M;
 *     console.log(m.n) // 10
 *
 * Defaults can be either `functions` which return the value to use as the default or the literal value itself. Either way, the value will be cast based on its field type before being set during document creation.
 *
 * ####Example:
 *
 *     // values are cast:
 *     var field = new Field({ aNumber: Number, default: "4.815162342" })
 *     var M = db.model('M', field)
 *     var m = new M;
 *     console.log(m.aNumber) // 4.815162342
 *
 *     // default unique objects for Mixed types:
 *     var field = new Field({ mixed: Field.Types.Mixed });
 *     field.path('mixed').default(function () {
 *       return {};
 *     });
 *
 *     // if we don't use a function to return object literals for Mixed defaults,
 *     // each document will receive a reference to the same object literal creating
 *     // a "shared" object instance:
 *     var field = new Field({ mixed: Field.Types.Mixed });
 *     field.path('mixed').default({});
 *     var M = db.model('M', field);
 *     var m1 = new M;
 *     m1.mixed.added = 1;
 *     console.log(m1.mixed); // { added: 1 }
 *     var m2 = new M;
 *     console.log(m2.mixed); // { added: 1 }
 *
 * @param {Function|any} val the default value
 * @return {defaultValue}
 * @api public
 */

Field.prototype.default = function (val) {
  if (1 === arguments.length) {
    this.defaultValue = typeof val === 'function' ? val : this.cast(val);
    return this;
  } else if (arguments.length > 1) {
    this.defaultValue = _.toArray(arguments);
  }
  if (arguments.length)
    this.emit('default', this.defaultValue);
  return this.defaultValue;
};

/**
 * Declares an unique index.
 *
 * ####Example:
 *
 *     var s = new Field({ name: { type: String, unique: true })
 *     Field.path('name').index({ unique: true });
 *
 * _NOTE: violating the constraint returns an `E11000` error from MongoDB when saving, not a Mongoose validation error._
 *
 * @param {Boolean} bool
 * @return {Field} this
 * @api public

Field.prototype.unique = function (bool) {
  //this._index.unique = bool;
  return this;
};
 */

/**
 * Adds a setter to this fieldtype.
 *
 * ####Example:
 *
 *     function capitalize (val) {
 *       if ('string' != typeof val) val = '';
 *       return val.charAt(0).toUpperCase() + val.substring(1);
 *     }
 *
 *     // defining within the field
 *     var s = new Field({ name: { type: String, set: capitalize }})
 *
 *     // or by retreiving its Field
 *     var s = new Field({ name: String })
 *     s.path('name').set(capitalize)
 *
 * Setters allow you to transform the data before it gets to the raw mongodb document and is set as a value on an actual key.
 *
 * Suppose you are implementing user registration for a website. Users provide an email and password, which gets saved to mongodb. The email is a string that you will want to normalize to lower case, in order to avoid one email having more than one account -- e.g., otherwise, avenue@q.com can be registered for 2 accounts via avenue@q.com and AvEnUe@Q.CoM.
 *
 * You can set up email lower case normalization easily via a Mongoose setter.
 *
 *     function toLower (v) {
 *       return v.toLowerCase();
 *     }
 *
 *     var UserField = new Field({
 *       email: { type: String, set: toLower }
 *     })
 *
 *     var User = db.model('User', UserField)
 *
 *     var user = new User({email: 'AVENUE@Q.COM'})
 *     console.log(user.email); // 'avenue@q.com'
 *
 *     // or
 *     var user = new User
 *     user.email = 'Avenue@Q.com'
 *     console.log(user.email) // 'avenue@q.com'
 *
 * As you can see above, setters allow you to transform the data before it gets to the raw mongodb document and is set as a value on an actual key.
 *
 * _NOTE: we could have also just used the built-in `lowercase: true` Field option instead of defining our own function._
 *
 *     new Field({ email: { type: String, lowercase: true }})
 *
 * Setters are also passed a second argument, the fieldtype on which the setter was defined. This allows for tailored behavior based on options passed in the field.
 *
 *     function inspector (val, fieldtype) {
 *       if (fieldtype.options.required) {
 *         return fieldtype.path + ' is required';
 *       } else {
 *         return val;
 *       }
 *     }
 *
 *     var VirusField = new Field({
 *       name: { type: String, required: true, set: inspector },
 *       taxonomy: { type: String, set: inspector }
 *     })
 *
 *     var Virus = db.model('Virus', VirusField);
 *     var v = new Virus({ name: 'Parvoviridae', taxonomy: 'Parvovirinae' });
 *
 *     console.log(v.name);     // name is required
 *     console.log(v.taxonomy); // Parvovirinae
 *
 * @param {Function} fn
 * @return {Field} this
 * @api public
 */

Field.prototype.set = function (fn) {
  if ('function' != typeof fn)
    throw new TypeError('A setter must be a function.');
  this.setters.push(fn);
  return this;
};

/**
 * Adds a getter to this fieldtype.
 *
 * ####Example:
 *
 *     function dob (val) {
 *       if (!val) return val;
 *       return (val.getMonth() + 1) + "/" + val.getDate() + "/" + val.getFullYear();
 *     }
 *
 *     // defining within the field
 *     var s = new Field({ born: { type: Date, get: dob })
 *
 *     // or by retreiving its Field
 *     var s = new Field({ born: Date })
 *     s.path('born').get(dob)
 *
 * Getters allow you to transform the representation of the data as it travels from the raw mongodb document to the value that you see.
 *
 * Suppose you are storing credit card numbers and you want to hide everything except the last 4 digits to the mongoose user. You can do so by defining a getter in the following way:
 *
 *     function obfuscate (cc) {
 *       return '****-****-****-' + cc.slice(cc.length-4, cc.length);
 *     }
 *
 *     var AccountField = new Field({
 *       creditCardNumber: { type: String, get: obfuscate }
 *     });
 *
 *     var Account = db.model('Account', AccountField);
 *
 *     Account.findById(id, function (err, found) {
 *       console.log(found.creditCardNumber); // '****-****-****-1234'
 *     });
 *
 * Getters are also passed a second argument, the fieldtype on which the getter was defined. This allows for tailored behavior based on options passed in the field.
 *
 *     function inspector (val, fieldtype) {
 *       if (fieldtype.options.required) {
 *         return fieldtype.path + ' is required';
 *       } else {
 *         return fieldtype.path + ' is not';
 *       }
 *     }
 *
 *     var VirusField = new Field({
 *       name: { type: String, required: true, get: inspector },
 *       taxonomy: { type: String, get: inspector }
 *     })
 *
 *     var Virus = db.model('Virus', VirusField);
 *
 *     Virus.findById(id, function (err, virus) {
 *       console.log(virus.name);     // name is required
 *       console.log(virus.taxonomy); // taxonomy is not
 *     })
 *
 * @param {Function} fn
 * @return {Field} this
 * @api public
 */

Field.prototype.get = function (fn) {
  if ('function' != typeof fn)
    throw new TypeError('A getter must be a function.');
  this.getters.push(fn);
  return this;
};

/**
 * Adds validator(s) for this document path.
 *
 * Validators always receive the value to validate as their first argument and must return `Boolean`. Returning false is interpreted as validation failure.
 *
 * ####Examples:
 *
 *     function validator (val) {
 *       return val == 'something';
 *     }
 *
 *     new Field({ name: { type: String, validate: validator }});
 *
 *     // with a custom error message
 *
 *     var custom = [validator, 'validation failed']
 *     new Field({ name: { type: String, validate: custom }});
 *
 *     var many = [
 *         { validator: validator, msg: 'uh oh' }
 *       , { validator: fn, msg: 'failed' }
 *     ]
 *     new Field({ name: { type: String, validate: many }});
 *
 *     // or utilizing Field methods directly:
 *
 *     var field = new Field({ name: 'string' });
 *     field.path('name').validate(validator, 'validation failed');
 *
 * ####Asynchronous validation:
 *
 * Passing a validator function that receives two arguments tells mongoose that the validator is an asynchronous validator. The second argument is an callback function that must be passed either `true` or `false` when validation is complete.
 *
 *     field.path('name').validate(function (value, respond) {
 *       doStuff(value, function () {
 *         ...
 *         respond(false); // validation failed
 *       })
*      }, 'my error type');
*
 * You might use asynchronous validators to retreive other documents from the database to validate against or to meet other I/O bound validation needs.
 *
 * Validation occurs `pre('save')` or whenever you manually execute [document#validate](#document_Document-validate).
 *
 * If validation fails during `pre('save')` and no callback was passed to receive the error, an `error` event will be emitted on your Models associated db [connection](#connection_Connection), passing the validation error object along.
 *
 *     var conn = mongoose.createConnection(..);
 *     conn.on('error', handleError);
 *
 *     var Product = conn.model('Product', yourField);
 *     var dvd = new Product(..);
 *     dvd.save(); // emits error on the `conn` above
 *
 * If you desire handling these errors at the Model level, attach an `error` listener to your Model and the event will instead be emitted there.
 *
 *     // registering an error listener on the Model lets us handle errors more locally
 *     Product.on('error', handleError);
 *
 * @param {RegExp|Function|Object} obj validator
 * @param {String} [error] optional error message
 * @api public
 */

Field.prototype.validate = function (obj, error) {
  if ('function' == typeof obj || obj && 'RegExp' === obj.constructor.name) {
    this.validators.push([obj, error]);
    return this;
  }

  var i = arguments.length,
      arg;

  while (i--) {
    arg = arguments[i];
    if (!(arg && 'Object' == arg.constructor.name)) {
      var msg = 'Invalid validator. Received (' + typeof arg + ') ' +
        arg +
        '. See http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate';

      throw new Error(msg);
    }
    this.validate(arg.validator, arg.msg);
  }

  return this;
};

/**
 * Adds a required validator to this fieldtype.
 *
 * ####Example:
 *
 *     var s = new Field({ born: { type: Date, required: true })
 *     // or
 *     form.path('name').required(true);
 *
 *
 * @param {Boolean} required enable/disable the validator
 * @return {Field} this
 * @api public
 */

Field.prototype.required = function (required) {
  var self = this;

  function __checkRequired (v) {
    return self.checkRequired(v, this);
  }

  if (false === required) {
    delete this.options.required;
    this.validators = this.validators.filter(function (v) {
      return v[0].name !== '__checkRequired';
    });
  } else {
    this.options.required = true;
    this.validators.push([__checkRequired, 'required']);
  }

  return this;
};

/**
 * Gets the default value
 *
 * @param {Object} scope the scope which callback are executed
 * @param {Boolean} init
 * @api private
 */

Field.prototype.getDefault = function (scope, init) {
  var ret = 'function' === typeof this.defaultValue ?
    this.defaultValue.call(scope) :
    this.defaultValue;

  if (null !== ret && undefined !== ret) {
    return this.cast(ret, scope, init);
  } else {
    return ret;
  }
};

/**
 * Applies setters
 *
 * @param {Object} value
 * @param {Object} scope
 * @param {Boolean} init
 * @api private
 */

Field.prototype.applySetters = function (value, scope, init, priorVal) {
  var v = value,
      setters = this.setters,
      len = setters.length;

  if (!len) {
    if (null === v || undefined === v) return v;
    return this.cast(v, scope, init, priorVal);
  }

  while (len--) {
    v = setters[len].call(scope, v, this);
  }

  if (null === v || undefined === v) return v;

  // do not cast until all setters are applied #665
  v = this.cast(v, scope, init, priorVal);

  return v;
};

/**
 * Applies getters to a value
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

Field.prototype.applyGetters = function (value, scope) {
  var v = value,
      getters = this.getters,
      len = getters.length;

  if (!len) {
    return v;
  }

  while (len--) {
    v = getters[len].call(scope, v, this);
  }

  return v;
};

/**
 * Performs a validation of `value` using the validators declared for this Field.
 *
 * @param {any} value
 * @param {Function} callback
 * @param {Object} scope
 * @api private
 */

Field.prototype.doValidate = function (value, fn, scope) {
  var err = false,
      path = this.path,
      count = this.validators.length;

  if (!count) return fn(null);

  function validate (ok, msg, val) {
    if (err) return;
    if (ok === undefined || ok) {
      if (!--count) fn(null);
    } else {
      fn(err = new ValidatorError(path, msg, val));
    }
  }

  this.validators.forEach(function (v) {
    var validator = v[0],
        message = v[1];

    if (validator instanceof RegExp) {
      validate(validator.test(value), message, value);
    } else if ('function' === typeof validator) {
      if (2 === validator.length) {
        validator.call(scope, value, function (ok) {
          validate(ok, message, value);
        });
      } else {
        validate(validator.call(scope, value), message, value);
      }
    }
  });
};

/**
 * Return field options
 *
 * @return {Object} options
 * @api public
 */
Field.prototype.export = function () {
  var attr = this.options.attributes || (this.options.attributes = {});

  if (!this.options.required && attr.required)
    delete attr.required;

  if (this.options.required)
    attr.required = null; // <input name="toto" required/>

  return this.options;
};

/*!
 * Module exports.
 */

module.exports = exports = Field;

exports.CastError = CastError;

exports.ValidatorError = ValidatorError;
