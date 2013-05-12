# Formal [![Build Status](https://travis-ci.org/nrako/formal.png?branch=master)](https://travis-ci.org/nrako/formal) [![Coverage Status](https://coveralls.io/repos/nrako/formal/badge.png?branch=master)](https://coveralls.io/r/nrako/formal) [![Dependency Status](https://gemnasium.com/nrako/formal.png)](https://gemnasium.com/nrako/formal)

Formal is a Form module for node.js inspired by mongoose, Formal provides casting, validation and much more!

DRY! If you use Mongoose, use [Formal-Mongoose](https://github.com/nrako/formal-mongoose) to define your form from an existing schema.

## Example

```javascript
var Form = require('formal');

var form = new Form({
  name: {
    family: String,
    first: {
      type: [String],
      set: function(val) {return val.split(' ');}
    }
  },
  email: {
    type: String,
    required: true,
    match: [/^[a-z0-9._-]+@[a-z0-9.-]{2,}[.][a-z]{2,3}$/, 'email],
    attributes: {
      type: 'email'
    }
  },
  age: {type: Number, min: 18}
}, {
  errors: {
    // custom error message for match validator
    email: 'Value is not a valid email'
}
});

form.set({
  name: {family: 'Martinez'},
  'name.first': 'José Luis Chavez',
  age: 12
});

form.validate(function (err) {
  console.log(err); // missing required email, age to low
  console.log(form.get('name.first.0')); // José
  console.log(form.export()); // data with nice error messages
});
```

## Install
`npm install formal --save`

## Summary

This module focus on form field casting and validation, with suppports for advanced path definition.

### It supports

* field of type: String, Number, Date, Boolean and [of each type] *(Arrays)*
* dot.F.notation path à la mongoose to access field and for.arrays.0 too
* shortcut validators, for required, enum, min, max and match to match mongoose
* shortcut setters mimicking mongoose for trim, lowercase and uppercase
* setters & getters
* custom validators
* virtuals
* route-middleware to work seamlessy with express or connect
* ... and of course it match mongoose but works fine without mongoose

### It doesn't

* render form to html (this will be supported via an external module)
* define a form from a mongoose schema, but [Formal-Mongoose](https://github.com/nrako/formal-mongoose) does!

### TODO... maybe

* support for sub-Form and array of [Form]
* npm package to "decorate" a form, render the form into html via [consolidate.js](https://github.com/visionmedia/consolidate.js/)
* support browser

## API

Summary of the most useful methods.  
For a complete list see [gh-pages documentation](http://nrako.github.io/formal).

### new Form(Object:definition[, Object:option]):instance

```javascript
var form = new Form({
  username: {
    type: String,
    trim: true,
    required: true
  },
  password: {
    type: String,
    trim: true,
    required: true
  }
}, {
  errors: {
    required: 'Please fill out this field'
  }
});
```

#### Options

```javascript
{
  dataSources: ['body', 'query', 'params'], // sources of data used by the route-middleware
  autoTrim: false,  // automatically add trim options to fields
  autoLocals: true,  // form.middleware adds form.export + validation results to res.locals
  errors: { // default errors message, can be extanded to match your own error type
    required: 'This is a required field',
    min: 'Value must be greater than or equal to <%= data.min %>',
    max: 'Value must be less than or equal to <%= data.max %>',
    enum: 'Value must be one of the following options: <%= data.enum.join(\', \') %>',
    regexp: 'Value is invalid and should match <%= data.match %>'
  }
}
```

##### `errors`

To define custom errors, refer to [Custom error message for a custom validation](#CustomError)


#### Connect and express route-middleware

For connect and express calling the constructor function will operate as a shorthand which return
the result of `form.middleware()` which will monkey patch the request and the response object.

```javascript
var form = require('formal');
app.post('/url',
  // sames as (new Form({...})).middleware()
  form({
    username: String
  }),
  function (req, res) {
    console.log(req.form);
    console.log(res.locals.form.username.value);
  }
);
```

### form.field(obj:Object):this

Define and add a new field to the form.

#### Alias

`form.add()`

```javascript
form.field({
  example: {
    'of.a.nested.field': String
  }
});
```

### form.set(path:String|obj:Object[, value])

Set values.

```javascript
form.set({
  username: 'nrako'
});

form.set('example.of.a.nested.field', 'overboard nested path example');
```

### form.get(path:String):value

Return a value with getters applied.

```javascript
console.log(form.get('username')); //nrako
```

### form.getData():Object

Return tree data with getters applied

```javascript
console.log(form.getData()); // Object
```

### form.validate(callback(err):Function)

Validate all fields and return an ValidationError object, if any, via the callback function.

```javascript
form.validate(function(err) {
  console.log(err) // ValidationError object
});
```

### form.export(err:ValidationError):Object

`err`: a ValidationError object returned by `from.validate`

Export and return an object which includes all friendly message error when error
template message is defined in `options.errors`.

```javascript
form.validate(function(err) {
  var result = form.export(err);
  console.log(result.username.value); // nrako
  console.log(result.password.error); // Please fill out this field
});
```

### form.middleware():Function(req, res, next)

Provide a route-middleware à la connect/express which will monkey patch
the `request.form` and `response.locals.form`.

```javascript
app.post('/url',
  form.middleware({
    username: String
  }),
  function (req, res) {
    console.log(req.form.getData());
    console.log(res.locals.form.username.value);
  }
);
```

## <a id="CustomError"></a>Custom error message for a custom validation

Custom error message within the result of `form.export(errors)` are available with the form `options.errors`.
Error message must be a valid [lodash](http://lodash.com/docs#template) string template which is populate with the field content.

### Example

```javascript
var form = new Form({
  a: {
    type: String,
    validate: [/^a/i, 'startWithA']
  },
  b: {
    type: String,
    validate: [/^b/i, 'startWithB']
  }
}, {
  errors: {
    'startWithA': 'Value <%= value %> should start with "a"'
  }
});

form.option('errors', {startWithB: 'Value <%= value %> should start with "b"'})

form.set({a: 'Babar', 'b': 'Basile'});

form.validate(function (err) {
  var result = form.export(err);
  console.log(result);
});
```

See the [tests](https://github.com/nrako/formal/blob/master/test/form.validation.spec.coffee) for more examples.

## Test
`npm test`  
[Mocha Coverage](http://nrako.github.io/formal/coverage.html)  
`npm run-script coverage`  
[On Coveralls.io](https://coveralls.io/r/nrako/formal)

All tests are in Coffee-script, hence easy to read! Provides a great way to understand the API ;)

## LICENSE

MIT
