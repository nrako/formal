### global describe, it, beforeEach ###

_ = require 'lodash'
chai = require 'chai'
expect = chai.expect
Form = require '../lib/form'
FieldTypes = Form.FieldTypes
Field = require '../lib/field/field'

describe 'Form validation', ->
  it 'supports min max shortcuts mongoose-like validators on Number', (done) ->
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

  it 'supports enum and match shortcults mongoose-like validators on String', (done) ->
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

    form.set
      'two': 'test'

    expect(form.requiredPaths()).to.deep.equal ['one', 'date', 'array']

    form.validate (err) ->
      expect(Object.keys(err.errors).length).to.equal 3
      expect(err.errors['one']).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors['date']).to.be.an.instanceof require '../lib/errors/validator'
      expect(err.errors['array']).to.be.an.instanceof require '../lib/errors/validator'

      form.path('tree').required true
      form.path('one').required false
      form.path('array').required false

      form.set
        'one': null

      form.validate (err) ->
        expect(Object.keys(err.errors).length).to.equal 2
        expect(err.errors['one']).to.be.undefined
        expect(err.errors['tree']).to.be.an.instanceof require '../lib/errors/validator'
        done()
