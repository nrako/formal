/* jshint camelcase: false, laxbreak: true, boss:true */
/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter,
    VirtualType = require('./virtualtype'),
    ValidatorError = require('./field/field').ValidatorError,
    ValidationError = require('./errors/validation'),
    mpath = require('mpath'),
    util = require('util'),
    _ = require('lodash'),
    Types;

/**
 * Form constructor.
 *
 * ####Example:
 *
 *     var child = new Form({ subform: String });
 *     var form = new Form({ name: String, age: Number, children: child });
 *
 *     // setting form data
 *     new Form({ name: String }, { attributes: {type='email'} })
 *
 * ####Data:
 * Accept an object which may be used to pass data for render purpose.
 *
 * ####Note:
 *
 * _When nesting forms, (`children` in the example above), always declare the child form first before passing it into is parent._
 *
 * @param {Object} definition
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @api public
 */

function Form (obj, options) {
  if (!(this instanceof Form))
    return (new Form(obj, options)).middleware();

  this.data = {};
  this.paths = {};
  this.subpaths = {};
  this.virtuals = {};
  this.nested = {};
  this.tree = {};
  this._requiredpaths = undefined;

  this.options = this.defaultOptions(options);

  // build paths
  if (obj) {
    this.field(obj);
  }

  EventEmitter.call(this);
}

/*!
 * Inherit from EventEmitter.
 */

util.inherits(Form, EventEmitter);

/**
 * Form as flat paths
 *
 * ####Example:
 *     {
 *         'something'  : Field,
 *       , 'nested.key' : Field,
 *     }
 *
 * @api private
 * @property paths
 */

Form.prototype.paths = {};

/**
 * Form as a tree
 *
 * ####Example:
 *     {
 *         'nested'  : {
 *             'key' : String
 *         }
 *     }
 *
 * @api private
 * @property tree
 */

Form.prototype.tree = {};


/**
 * Returns default options for this form, merged with `options`.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */

Form.prototype.defaultOptions = function (options) {
  options = _.assign({
    dataSources: ['body', 'query', 'params'],
    autoTrim: false,
    autoLocals: true,
    passThrough: false,
  }, options);

  return options;
};

/**
 * Adds key path / field type pairs to this form.
 *
 * ####Example:
 *
 *     var ToyForm = new Form;
 *     ToyForm.add({ name: 'string', color: 'string', price: 'number' });
 *     // alias
 *     ToyForm.field(...)
 *
 * @param {Object} obj
 * @param {String} prefix
 * @api public
 */

Form.prototype.field = Form.prototype.add = function add (obj, prefix) {
  prefix = prefix || '';
  for (var i in obj) {
    if (null === obj[i]) {
      throw new TypeError('Invalid value for field path `'+ prefix + i +'`');
    }

    if (obj[i].constructor.name == 'Object' && (!obj[i].type || obj[i].type.type)) {
      if (Object.keys(obj[i]).length) {
        // nested object { last: { name: String }}
        this.nested[prefix + i] = true;
        this.add(obj[i], prefix + i + '.');
      } else {
        this.path(prefix + i, obj[i]); // mixed type
      }
    } else {
      this.path(prefix + i, obj[i]);
    }
  }
};

/**
 * Gets/sets form paths.
 *
 * Sets a path (if arity 2)
 * Gets a path (if arity 1)
 *
 * ####Example
 *
 *     form.path('name') // returns a Field
 *     form.path('name', Number) // changes the fieldType of `name` to Number
 *
 * @param {String} path
 * @param {Object} constructor
 * @api public
 */

Form.prototype.path = function (path, obj) {
  var self = this,
      field;

  if (obj === undefined) {
    if (this.paths[path]) return this.paths[path];
    if (this.subpaths[path]) return this.subpaths[path];

    // subpaths?
    return (/\.\d+\.?.*$/).test(path)
      ? getPositionalPath(this, path)
      : undefined;
  }

  // update the tree
  var subpaths = path.split(/\./),
      last = subpaths.pop(),
      branch = this.tree;

  subpaths.forEach(function(sub, i) {
    if (!branch[sub]) branch[sub] = {};
    if (typeof branch[sub] != 'object' ) {
      var msg = 'Cannot set nested path `' + path + '`. '
              + 'Parent path `'
              + subpaths.slice(0, i).concat([sub]).join('.')
              + '` already set to type ' + branch[sub].name
              + '.';
      throw new Error(msg);
    }
    branch = branch[sub];
  });

  branch[last] = _.clone(obj, true);

  field = Form.interpretAsType(path, obj);

  this.paths[path] = field;

  // set default value
  var def = field.getDefault();
  if (def)
    this.setValue(path, def);

  // when default() method is used on field
  field.on('default', function (def) {
    var val = self.getValue(path);
    if (!val || Array.isArray(val) && val.length === 0)
      self.setValue(path, def);
  });

  return this;
};

/**
 * Converts type arguments into Mongoose Types.
 *
 * @param {String} path
 * @param {Object} obj constructor
 * @api private
 */

Form.interpretAsType = function (path, obj) {
  if (obj.constructor.name != 'Object')
    obj = { type: obj };

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj.type && !obj.type.type
    ? obj.type
    : {};

  if (Array.isArray(type) || Array == type || 'array' == type) {
    // if it was specified through { type } look for `cast`
    var cast = (Array == type || 'array' == type)
      ? obj.cast
      : type[0];

    if (cast instanceof Form) {
      return new Types.FormArray(path, cast, obj);
    }

    if ('string' == typeof cast) {
      cast = Types[cast.charAt(0).toUpperCase() + cast.substring(1)];
    } else if (cast && (!cast.type || cast.type.type)
                    && 'Object' == cast.constructor.name
                    && Object.keys(cast).length) {
      return new Types.FormArray(path, new Form(cast), obj);
    }

    return new Types.Array(path, cast, obj);
  }

  var name = 'string' == typeof type
    ? type
    : type.name;

  if (name) {
    name = name.charAt(0).toUpperCase() + name.substring(1);
  }

  if (undefined === Types[name]) {
    throw new TypeError('Undefined type at `' + path +
        '`\n  Did you try nesting Forms? ' +
        'You can only nest using refs or arrays.');
  }

  return new Types[name](path, obj);
};


/**
 * Returns an Array of path strings that are required by this form.
 *
 * @api public
 * @return {Array}
 */

Form.prototype.requiredPaths = function requiredPaths () {
  if (this._requiredpaths) return this._requiredpaths;

  var ret = [];

  _.each(this.paths, function(field) {
    if (field.options.required) ret.push(field.path);
  });

  this._requiredpaths = ret;
  return this._requiredpaths;
};

/**
 * Returns the pathType of `path` for this form.
 *
 * Given a path, returns whether it is a real, virtual, nested, or ad-hoc/undefined path.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

Form.prototype.pathType = function (path) {
  if (path in this.paths) return 'real';
  if (path in this.virtuals) return 'virtual';
  if (path in this.nested) return 'nested';
  if (path in this.subpaths) return 'real';

  if (/\.\d+\.|\.\d+$/.test(path) && getPositionalPath(this, path)) {
    return 'real';
  } else {
    return 'adhocOrUndefined';
  }
};

/*!
 * ignore
 */

function getPositionalPath (self, path) {
  var subpaths = path.split(/\.(\d+)\.|\.(\d+)$/).filter(Boolean);
  if (subpaths.length < 2) {
    return self.paths[subpaths[0]];
  }

  var val = self.path(subpaths[0]);
  if (!val) return val;

  var last = subpaths.length - 1,
      subpath, i = 1;

  for (; i < subpaths.length; ++i) {
    subpath = subpaths[i];

    if (i === last && val && !val.form && !/\D/.test(subpath)) {
      if (val instanceof Types.Array) {
        // StringField, NumberField, etc
        val = val.caster;
      } else {
        val = undefined;
      }
      break;
    }

    // ignore if its just a position segment: path.0.subpath
    if (!/\D/.test(subpath)) continue;

    if (!(val && val.form)) {
      val = undefined;
      break;
    }

    val = val.form.path(subpath);
  }

  return self.subpaths[path] = val;
}

/**
 * Registers a plugin for this form.
 *
 * @param {Function} plugin callback
 * @param {Object} opts
 * @see plugins
 * @api public
 */

Form.prototype.plugin = function (fn, opts) {
  fn(this, opts);
  return this;
};

/**
 * Sets/gets a form option.
 *
 * @param {String} key option name
 * @param {Object} [value] if not passed, the current option value is returned
 * @api public
 */

Form.prototype.option = function (key, value) {
  if (1 === arguments.length) {
    return this.options[key];
  }

  this.options[key] = value;

  return this;
};

/**
 * Creates a virtual type with the given name.
 *
 * @param {String} name
 * @param {Object} [options]
 * @return {VirtualType}
 */

Form.prototype.virtual = function(name, options) {
  var self = this;
  var virtuals = this.virtuals;
  var parts = name.split('.');
  return virtuals[name] = parts.reduce(
    function(mem, part, i) {
      if (!mem[part]) mem[part] = (i === parts.length - 1) ? new VirtualType(options, name, self.data) : {};
      return mem[part];
    },
    this.tree
  );
};

/**
 * Returns the virtual type with the given `name`.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Form.prototype.virtualpath = function (name) {
  return this.virtuals[name];
};

/**
 * Sets the value of a path, or many paths.
 *
 * ####Example:
 *
 *     // path, value
 *     doc.set(path, value)
 *
 *     // object
 *     doc.set({
 *         path  : value
 *       , path2 : {
 *            path  : value
 *         }
 *     })
 *
 *     // only-the-fly cast to number
 *     doc.set(path, value, Number)
 *
 *     // only-the-fly cast to string
 *     doc.set(path, value, String)
 *
 * @param {String|Object} path path or object of key/vals to set
 * @param {Any} val the value to set
 * @param {Schema|String|Number|Buffer|etc..} [type] optionally specify a type for "on-the-fly" attributes
 * @param {Object} [options] optionally specify options that modify the behavior of the set
 * @api public
 */

Form.prototype.set = function (path, val, type, options) {
  if (type && 'Object' == type.constructor.name) {
    options = type;
    type = undefined;
  }

  var merge = options && options.merge,
    constructing = true === type;

  if (typeof path !== 'string') {
    if (null === path || undefined === path) {
      var v = path;
      path = val;
      val = v;

    } else {
      var prefix = val ? val + '.' : '';

      if (path instanceof Form) path = path.data;

      var keys = Object.keys(path),
        i = keys.length,
        pathtype, key;

      while (i--) {
        key = keys[i];
        pathtype = this.pathType(prefix + key);
        if (path[key] && 'Object' === path[key].constructor.name && 'virtual' !== pathtype) {
          this.set(path[key], prefix + key, constructing);
        } else if (undefined !== path[key]) {
          this.set(prefix + key, path[key], constructing);
        }
      }

      return this;
    }
  }

  // form = new Form({ path: { nest: 'string' }})
  // form.set('path', obj);
  var pathType = this.pathType(path);
  if ('nested' == pathType && val && 'Object' == val.constructor.name) {
    if (!merge) this.setValue(path, null);
    this.set(val, path, constructing);
    return this;
  }

  var field;
  var parts = path.split('.');

  if ('virtual' == pathType) {
    field = this.virtualpath(path);
    field.applySetters(val, this);
    return this;
  } else {
    field = this.path(path);
  }

  if (!field || null === val || undefined === val) {
    _set(this.data, parts, val);
    return this;
  }

  var shouldSet = true;
  try {
    val = field.applySetters(val, this, false, this.getValue(path));
  } catch (err) {
    // casting error put on silence
    //this.invalidate(path, err, val);
  }

  if (shouldSet) {
    _set(this.data, parts, val);
  }

  return this;
};

/**
 * Returns the value of a path.
 *
 * ####Example
 *
 *     // path
 *     doc.get('age') // 47
 *
 *     // dynamic casting to a string
 *     doc.get('age', String) // "47"
 *
 * @param {String} path
 * @param {Field|String|Number|Buffer|etc..} [type] optionally specify a type for on-the-fly attributes
 * @api public
 */

Form.prototype.get = function get (path) {
  var field = this.path(path) || this.virtualpath(path),
      pieces = path.split('.'),
      obj = this.data;

  for (var i = 0, l = pieces.length; i < l; i++) {
    obj = undefined === obj || null === obj
      ? undefined
      : obj[pieces[i]];
  }


  if (field) {
    obj = field.applyGetters(obj, this);
  }

  return obj;
};

/**
 * Executes registered validation field rules for this form.
 *
 * ####Example:
 *
 *     form.validate(function (err) {
 *       if (err) handleError(err);
 *       else // validation passed
 *     });
 *
 * @param {Function} cb called after validation completes, passing an error if one occurred
 * @api public
 */

Form.prototype.validate = function (cb) {
  var self = this;

  var paths = Object.keys(this.paths);

  if (0 === paths.length) {
    complete();
    return this;
  }

  var validating = {}, total = 0;

  paths.forEach(validatePath);
  return this;

  function validatePath (path) {
    if (validating[path]) return;

    validating[path] = true;
    total++;

    process.nextTick(function() {
      var p = self.path(path);
      if (!p) return --total || complete();

      var val = self.getValue(path);
      p.doValidate(val, function(err) {
        if (err) {
          self.invalidate(path, err, undefined, true); // embedded docs
        }
        if (!--total)
          complete();
      }, self);
    });
  }

  function complete () {
    var err = self.validationError;
    self.validationError = undefined;
    self.emit('validate', self);
    cb(err);
  }
};

/**
 * Gets a raw value from a path (no getters)
 *
 * @param {String} path
 * @api private
 */

Form.prototype.getValue = function (path) {
  return mpath.get(path, this.data);
};

/**
 * Sets a raw value for a path (no casting, setters, transformations)
 *
 * @param {String} path
 * @param {Object} value
 * @api private
 */
Form.prototype.setValue = function (path, val) {
  mpath.set(path, val, this.data);
  return this;
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} err the error which states the reason `path` was invalid
 * @param {Object|String|Number|any} value optional invalid value
 * @api public
 */

Form.prototype.invalidate = function (path, err, val) {
  if (!this.validationError) {
    this.validationError = new ValidationError(this);
  }

  if (!err || 'string' === typeof err) {
    // sniffing arguments:
    // need to handle case where user does not pass value
    // so our error message is cleaner
    err = 2 < arguments.length ? new ValidatorError(path, err, val) : new ValidatorError(path, err);
  }

  this.validationError.errors[path] = err;
};

Form.prototype.export = function (err) {
  var form = this,
      result = {};

  Object.keys(this.paths).forEach(function (path, index) {
    var field = {
      value: form.get(path),
      data: form.path(path).export()
    };

    var fielderror = mpath.get(path, err.errors);

    if (fielderror)
      field.error = fielderror.message;

    _set(result, path.split('.'), field);
  });

  return result;
};

/**
 * Provides a req, res, next callback aka route-middleware for connect and express
 *
 * ####Note:
 *
 * Provides an helper route-middleware for express and connect callback
 *
 * @param  {Object}   req  request object
 * @param  {Object}   res  response object
 * @param  {Function} next callback
 */
Form.prototype.middleware = function (req, res, next) {
  var form = this;

  return function (req, res, next) {
    var mergedSource = {};
    form.options.dataSources.forEach(function(source) {
      if (req[source])
        _.merge(mergedSource, req[source]);
    });

    form.set(mergedSource);

    form.validate(function (err) {
      if (form.options.autoLocals) {
        res.locals.form = form.export(err);
        res.locals.isValid = !!err;
      }
      next();
    });
  };

};

/*!
 * Module exports.
 */

module.exports = exports = Form;

// require down here because of reference issues

/**
 * The various built-in Field Types which mimic Mongoose Schema Type.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var ObjectId = mongoose.Schema.Types.ObjectId;
 *
 * ####Types:
 *
 * - [String](#field-string-js)
 * - [Number](#field-number-js)
 * - [Boolean](#field-boolean-js) | Bool
 * - [Array](#field-array-js)
 * - [Buffer](#field-buffer-js) // TODO?
 * - [Date](#field-date-js)
 * - [ObjectId](#field-objectid-js) | Oid // TODO
 * - [Mixed](#field-mixed-js)  // mixed type removed
 *
 * Using this exposed access to the `Mixed` Field, we can use them in our form.
 *
 *     var Mixed = mongoose.Schema.Types.Mixed;
 *     new mongoose.Schema({ _user: Mixed })
 *
 * @api public
 */

Form.FieldTypes = require('./field/types');

/*!
 * ignore
 */

Types = Form.FieldTypes;
var ObjectId = exports.ObjectId = Types.ObjectId;


/**
 * Set a value to obj from parts of a path
 *
 * @api private
 * @memberOf Form
 */

var _set = function (obj, parts, val) {

  var i = 0,
      l = parts.length;

  for (; i < l; i++) {
    var next = i + 1,
        last = next === l;

    if (last) {
      obj[parts[i]] = val;
      return;
    }

    if (obj[parts[i]] && 'Object' === obj[parts[i]].constructor.name) {
      obj = obj[parts[i]];
    } else if (obj[parts[i]] && Array.isArray(obj[parts[i]])) {
      obj = obj[parts[i]];
    } else {
      obj = obj[parts[i]] = {};
    }
  }
};

