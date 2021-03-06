### global describe, it, beforeEach ###

template = require 'lodash-template'
chai = require 'chai'
expect = chai.expect
Form = require '../lib/form'
FieldTypes = Form.FieldTypes
Field = require '../lib/field/field'

describe 'Form validation', ->
  it 'supports min max shorthand mongoose-like validators on Number', (done) ->
    form = new Form
      1:
        type: Number
        max: 8
      2:
        type: Number
        min : -8
      3:
        type: Number
        min: 8

    form.set
      1: 9
      2: -9

    form.validate (err) ->
      expect(err).to.be.an.instanceof require '../lib/errors/validation'
      expect(err.toString()).to.be.a.string
      expect(err.errors[1]).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors[2]).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors[3]).to.be.undefined

      form.path(1).max 9, 'custom msg'
      form.path(3).min(null)

      form.set
        2: -8

      form.validate (err) ->
        expect(err).to.be.undefined

        done()

  it 'supports enum and match shorthand mongoose-like validators on String', (done) ->
    form = new Form
      'one':
        type: String
        enum: ['top', 'bottom', 'left', 'right']
      'two':
        type: String
        match: /^a/
      'tree':
        type: String
        enum: ['top', 'bottom']

    form.set
      'one': 'middle'
      'two': 'ba'
      'tree': 'middle'

    form.validate (err) ->
      expect(err.errors['one']).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors['two']).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors['tree']).to.be.an.instanceof require '../lib/errors/validator'

      form.path('tree').enum false

      form.set
        'one': 'left'
        'two': 'apple'

      form.validate (err) ->
        expect(err).to.be.undefined

        done()

  it 'supports custom validators', (done) ->
    colorValidator = (value) ->
      return /blue|green|white|red|orange|periwinkel/i.test value

    form = new Form
      'one': String
      'two':
        type: String
        validate:
          validator: /^blue/
          msg: 'Custom validation message'
      'tree':
        type: String
        validate: (value, respond) ->
          #async
          respond true

    form.path('one').validate colorValidator, 'optional error message'

    form.set
      'one': 'not a color',
      'two': 'blue'

    form.validate (err) ->
      expect(Object.keys(err.errors).length).to.equal 1
      expect(err.errors['one']).to.be.an.instanceof require '../lib/errors/validator'

      form.set
        'one': 'blue'

      form.validate (err) ->
        expect(err).to.be.undefined

        fn = ->
          form.path('two').validate 'bad validator'

        expect(fn).to.throw Error

        done()

  it 'supports required validator', (done) ->
    form = new Form
      'one':
        type: String
        required: true
      'two': String
      'tree': Number
      'date':
        type: Date
        required: true
      'array':
        type: [String]
        required: true
      nested:
        deep:
          type: String
          required: true

    form.set
      'two': 'test'

    expect(form.requiredPaths()).to.deep.equal ['one', 'date', 'array', 'nested.deep']

    form.validate (err) ->
      expect(Object.keys(err.errors).length).to.equal 4
      expect(err.errors['one']).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors['date']).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors['array']).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors['nested.deep']).to.be.an.instanceof require '../lib/errors/validator'

      form.path('tree').required true
      form.path('one').required false
      form.path('array').required false

      form.set
        'one': null

      form.validate (err) ->
        expect(Object.keys(err.errors).length).to.equal 3
        expect(err.errors['one']).to.be.undefined
        expect(err.errors['tree']).to.be.an.instanceof require '../lib/errors/validator'
        done()

  it 'supports nice custom errors message for required, min, max and custom validator', (done) ->
    form = new Form
      a:
        type: String
        required: true
      aa:
        type: String
        enum: ['a', 'b', 'c']
      ab:
        type: String
        match: /^a/
      b:
        type: Number
        min: 8
      c:
        type: Number
        max: 8
      d:
        type: String
        validate: [/^a/, 'startWithA']
        label: 'Field D'
    ,
    errors:
      max: '<%= value %> should be at max at <%= data.max %>!'
      startWithA: '<%= data.label %> with value "<%= value %>" must start with "a"'

    form.set
      ab: 'b'
      b: 0
      c: 23
      d: 'test'

    form.validate (err) ->
      o = form.export(err)

      try
        expect(o.a.error).to.equal template(form.options.errors.required, {})
        expect(o.aa.error).to.equal template(form.options.errors.enum, {data: enum: ['a', 'b', 'c']})
        expect(o.ab.error).to.equal template(form.options.errors.regexp, {data: match: /^a/})
        expect(o.b.error).to.equal template(form.options.errors.min, {data: {min: 8}})
        expect(o.c.error).to.equal template(form.options.errors.max, {data: {max: 8}, value: '23'})
        expect(o.d.error).to.equal template(form.options.errors.startWithA, {data: {label: 'Field D'}, value: 'test'})
      catch e
        return done e

      done()
