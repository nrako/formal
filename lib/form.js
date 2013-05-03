/* jshint camelcase: false, laxbreak: true, boss:true */
/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter,
    VirtualType = require('./virtualtype'),
    utils = require('./utils'),
    Types;

/**
 * Form constructor.
 *
 * ####Example:
 *
 *     var child = new Form({ name: String });
 *     var form = new Form({ name: String, age: Number, children: [child] });
 *     var Tree = mongoose.model('Tree', form);
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
 * @event `init`: Emitted after the form is compiled into a `Model`.
 * @api public
 */

function Form (obj, options) {
  if (!(this instanceof Form))
    return new Form(obj, options);

  this.data = {};
  this.paths = {};
  this.subpaths = {};
  this.virtuals = {};
  this.nested = {};
  this.callQueue = [];
  this.methods = {};
  this.tree = {};
  this._requiredpaths = undefined;

  this.options = this.defaultOptions(options);

  // build paths
  if (obj) {
    this.field(obj);
  }
}

/*!
 * Inherit from EventEmitter.
 */

Form.prototype.__proto__ = EventEmitter.prototype;

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

Form.prototype.paths;

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

Form.prototype.tree;

/**
 * Returns default options for this form, merged with `options`.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */

Form.prototype.defaultOptions = function (options) {
  options = utils.options({
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
 * Reserved document keys.
 *
 * Keys in this object are names that are rejected in form declarations b/c they conflict with mongoose functionality. Using these key name will throw an error.
 *
 *      on, emit, _events, db, init, isNew, errors, form, options, modelName, collection, _pres, _posts, toObject
 *
 * _NOTE:_ Use of these terms as method names is permitted, but play at your own risk, as they may be existing mongoose document methods you are stomping on.
 *
 *      var form = new Form(..);
 *      form.methods.init = function () {} // potentially breaking
 */

Form.reserved = Object.create(null);
var reserved = Form.reserved;
reserved.on =
reserved.init =
reserved.errors =
reserved.field =
reserved.options =
reserved.toObject =
reserved.emit =    // EventEmitter
reserved._events = // EventEmitter
reserved._pres = reserved._posts = 1; // hooks.js

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
  if (obj === undefined) {
    if (this.paths[path]) return this.paths[path];
    if (this.subpaths[path]) return this.subpaths[path];

    // subpaths?
    return (/\.\d+\.?.*$/).test(path)
      ? getPositionalPath(this, path)
      : undefined;
  }

  // some path names conflict with document methods
  if (reserved[path]) {
    throw new Error('`' + path + '` may not be used as a field pathname');
  }

  // update the tree
  var subpaths = path.split(/\./),
      last = subpaths.pop(),
      branch = this.tree;

  subpaths.forEach(function(sub, i) {
    if (!branch[sub]) branch[sub] = {};
    if ('object' != typeof branch[sub]) {
      var msg = 'Cannot set nested path `' + path + '`. '
              + 'Parent path `'
              + subpaths.slice(0, i).concat([sub]).join('.')
              + '` already set to type ' + branch[sub].name
              + '.';
      throw new Error(msg);
    }
    branch = branch[sub];
  });

  branch[last] = utils.clone(obj);

  this.paths[path] = Form.interpretAsType(path, obj);
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

  if ('Object' == type.constructor.name || 'mixed' == type) {
    return new Types.Mixed(path, obj);
  }

  if (Array.isArray(type) || Array == type || 'array' == type) {
    // if it was specified through { type } look for `cast`
    var cast = (Array == type || 'array' == type)
      ? obj.cast
      : type[0];

    if (cast instanceof Form) {
      return new Types.DocumentArray(path, cast, obj);
    }

    if ('string' == typeof cast) {
      cast = Types[cast.charAt(0).toUpperCase() + cast.substring(1)];
    } else if (cast && (!cast.type || cast.type.type)
                    && 'Object' == cast.constructor.name
                    && Object.keys(cast).length) {
      return new Types.DocumentArray(path, new Form(cast), obj);
    }

    return new Types.Array(path, cast || Types.Mixed, obj);
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
 * Iterates the fields paths similar to Array#forEach.
 *
 * The callback is passed the pathname and fieldType as arguments on each iteration.
 *
 * @param {Function} fn callback function
 * @return {Form} this
 * @api public
 */

Form.prototype.eachPath = function (fn) {
  var keys = Object.keys(this.paths),
      len = keys.length;

  for (var i = 0; i < len; ++i) {
    fn(keys[i], this.paths[keys[i]]);
  }

  return this;
};

/**
 * Returns an Array of path strings that are required by this form.
 *
 * @api public
 * @return {Array}
 */

Form.prototype.requiredPaths = function requiredPaths () {
  if (this._requiredpaths) return this._requiredpaths;

  var paths = Object.keys(this.paths),
      i = paths.length,
      ret = [];

  while (i--) {
    var path = paths[i];
    if (this.paths[path].isRequired) ret.push(path);
  }
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
 * Adds a method call to the queue.
 *
 * @param {String} name name of the document method to call later
 * @param {Array} args arguments to pass to the method
 * @api private
 */

Form.prototype.queue = function(name, args){
  this.callQueue.push([name, args]);
  return this;
};

/**
 * Defines a pre hook for the document.
 *
 * ####Example
 *
 *     var toyForm = new Form(..);
 *
 *     toyForm.pre('save', function (next) {
 *       if (!this.created) this.created = new Date;
 *       next();
 *     })
 *
 *     toyForm.pre('validate', function (next) {
 *       if (this.name != 'Woody') this.name = 'Woody';
 *       next();
 *     })
 *
 * @param {String} method
 * @param {Function} callback
 * @see hooks.js https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3
 * @api public
 */

Form.prototype.pre = function(){
  return this.queue('pre', arguments);
};

/**
 * Defines a post for the document
 *
 * Post hooks fire `on` the event emitted from document instances of Models compiled from this form.
 *
 *     var form = new Form(..);
 *     form.post('save', function (doc) {
 *       console.log('this fired after a document was saved');
 *     });
 *
 *     var Model = mongoose.model('Model', form);
 *
 *     var m = new Model(..);
 *     m.save(function (err) {
 *       console.log('this fires after the `post` hook');
 *     });
 *
 * @param {String} method name of the method to hook
 * @param {Function} fn callback
 * @see hooks.js https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3
 * @api public
 */

Form.prototype.post = function(method, fn){
  return this.queue('on', arguments);
};

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
 * Adds an instance method to documents constructed from Models compiled from this form.
 *
 * ####Example
 *
 *     var form = kittyForm = new Form(..);
 *
 *     form.method('meow', function () {
 *       console.log('meeeeeoooooooooooow');
 *     })
 *
 *     var Kitty = mongoose.model('Kitty', form);
 *
 *     var fizz = new Kitty;
 *     fizz.meow(); // meeeeeooooooooooooow
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.
 *
 *     form.method({
 *         purr: function () {}
 *       , scratch: function () {}
 *     });
 *
 *     // later
 *     fizz.purr();
 *     fizz.scratch();
 *
 * @param {String|Object} method name
 * @param {Function} [fn]
 * @api public
 */

Form.prototype.method = function (name, fn) {
  if ('string' != typeof name)
    for (var i in name)
      this.methods[i] = name[i];
  else
    this.methods[name] = fn;
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

Form.prototype.virtual = function (name, options) {
  var virtuals = this.virtuals;
  var parts = name.split('.');
  return virtuals[name] = parts.reduce(function (mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length-1)
                            ? new VirtualType(options, name)
                            : {});
    return mem[part];
  }, this.tree);
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

  if ('string' !== typeof path) {
    // new Document({ key: val })

    if (null === path || undefined === path) {
      var _ = path;
      path = val;
      val = _;

    } else {
      var prefix = val
        ? val + '.'
        : '';

      if (path instanceof Form) path = path.data;

      var keys = Object.keys(path),
        i = keys.length,
        pathtype, key;

      while (i--) {
        key = keys[i];
        pathtype = this.pathType(prefix + key);
        if (null != path[key]
            && 'Object' == path[key].constructor.name
            && 'virtual' != pathtype) {
          this.set(path[key], prefix + key, constructing);
        } else if (undefined !== path[key]) {
          this.set(prefix + key, path[key], constructing);
        }
      }

      return this;
    }
  }

  // docschema = new Schema({ path: { nest: 'string' }})
  // doc.set('path', obj);
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

  var pathToMark;

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"

  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    pathToMark = path;
    /*
    for (var index = 0; index < parts.length; ++index) {
      var subPath = parts.slice(0, index+1).join('.');
      if (this.isDirectModified(subPath) // earlier prefixes that are already
                                         // marked as dirty have precedence
          || this.get(subPath) === null) {
        pathToMark = subPath;
        break;
      }
    }

    if (!pathToMark) pathToMark = path;
    */
  }

  // if this doc is being constructed we should not trigger getters
  var priorVal = constructing ? undefined : this.get(path);

  if (!field || null === val || undefined === val) {
    this.$__set(pathToMark, path, constructing, parts, field, val, priorVal);
    return this;
  }

  var self = this;
  var shouldSet = this.$__try(function(){
    val = field.applySetters(val, self, false, priorVal);
  });

  if (shouldSet) {
    this.$__set(pathToMark, path, constructing, parts, field, val, priorVal);
  }

  return this;
};

/**
 * Handles the actual setting of the value and marking the path modified if appropriate.
 *
 * @api private
 * @method $__set
 * @memberOf Document
 */

Form.prototype.$__set = function (pathToMark, path, constructing, parts, schema, val, priorVal) {

  var obj = this.data,
      i = 0,
      l = parts.length;

  for (; i < l; i++) {
    var next = i + 1,
        last = next === l;

    if (last) {
      obj[parts[i]] = val;
    } else {
      if (obj[parts[i]] && 'Object' === obj[parts[i]].constructor.name) {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && Array.isArray(obj[parts[i]])) {
        obj = obj[parts[i]];
      } else {
        obj = obj[parts[i]] = {};
      }
    }
  }
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

Form.prototype.get = function (path) {
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
 * Catches errors that occur during execution of `fn` and stores them to later be passed when `save()` is executed.
 *
 * @param {Function} fn function to execute
 * @param {Object} scope the scope with which to call fn
 * @api private
 * @method $__try
 * @memberOf Form
 */

Form.prototype.$__try = function (fn, scope) {
  var res;
  try {
    fn.call(scope);
    res = true;
  } catch (e) {
    console.error(e);
    this.$__error(e);
    res = false;
  }
  return res;
};

/**
 * Registers an error
 *
 * @param {Error} err
 * @api private
 * @method $__error
 * @memberOf Form
 */

Form.prototype.$__error = function (err) {
  this.saveError = err;
  return this;
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
 * - [Mixed](#field-mixed-js)  // TODO
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

