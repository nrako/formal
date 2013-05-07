# Conform

**con·form  [kuhn-fawrm]**  
*~~verb~~ form (used ~~without~~ via object)*  
**1.** to act in accordance or harmony; comply (usually followed by to  ): *to conform to rules.*  

**Conform is an awesome node.js Form module with casting and validation inspired by mongoose!**

[![Build Status](https://travis-ci.org/nrako/conform.png?branch=master)](https://travis-ci.org/nrako/conform)
[![Coverage Status](https://coveralls.io/repos/nrako/conform/badge.png?branch=master)](https://coveralls.io/r/nrako/conform)
[![Dependency Status](https://gemnasium.com/nrako/conform.png)](https://gemnasium.com/nrako/conform)

## Example
```javascript
var Form = require('conform');

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
    match: /^[a-z0-9._-]+@[a-z0-9.-]{2,}[.][a-z]{2,3}$/,
    attributes: {
      type: 'email'
    }
  },
  age: {type: Number, min: 18}
});

form.set({
  name: {family: 'Martinez'},
  'name.first': 'José Luis Chavez',
  age: 12
});

form.validate(function (err) {
  console.log(err); // missing required email, age to low
  console.log(form.get('name.first.0')); // José
  console.log(form.export());
});
```

## Install
`npm install conform --save`

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

### To comes... maybe

* support for sub-Form
* support for sub-[Form]
* incoming npm module to define the form from an existing mongoose schema
* incoming npm (decorator) module to render the form into html via consolidate.js
* support browser

## API

Summary of the most useful methods.  
For a complete list see [gh-pages documentation](http://nrako.github.io/conform).

### new Form(Object:definition[, Object:option]):instance

For connect and express the alternative factory method can be used as a quick helper to
create a new instance and return form.middleware() to monkey patch the request and
response object.
```javascript
app.post('/url',
  // sames as (new Form({...})).middleware()
  form({
    fieldA: String
  }),
  function (req, res) {
    console.log(req.body.form);
    console.log(res.locals.form.fieldA.value);
  }
);
```

### form.field(obj:Object):this

Define a new field.

```javascript
form.set({
  example: {
    'of.a.nested.field': String
  }
});
```

### form.path(path:String):Field (arity 1)

### form.path(path:String, obj:Object):this (arity 2)

### form.set(path:String|obj:Object[, value])

### form.get(path:String):value

### form.validate(callback(err):Function)

Validate all fields and return an err object, if any, via the callback function.

### form.middleware():Function(req, res, next)

Provide a route-middleware à la connect/express which will monkey patch
the `req.body.form` and `res.locals.form`.

## Test
`npm test`
[Coverage](http://nrako.github.io/conform/coverage.html)
`npm run-script coverage`

Tests are in Coffee-script and easy to read! Provides a great way to understand the API.

## LICENSE

MIT
