### global describe, it, beforeEach ###

_ = require 'lodash'
chai = require 'chai'
expect = chai.expect
Form = require '../lib/form'
FieldTypes = Form.FieldTypes

describe 'Form', ->

  describe 'form constructor and fields', ->

    it 'supports different fieldtypes', ->

      form = new Form
        title: String
        #created: Date
        #open: Boolean

      expect(form.path 'title' ).to.be.an.instanceof FieldTypes.String

    it 'supports dot notation for path accessors', ->
      form = new Form
        nested:
          property: String
          deep:
            property: String
        'nested.string.property': String

      expect(form.path 'nested.property').to.be.an.instanceof FieldTypes.String
      expect(form.path 'nested.deep.property').to.be.an.instanceof FieldTypes.String
      expect(form.path 'nested.string.property').to.be.an.instanceof FieldTypes.String
      expect(form.path 'nested.inexistant').to.be.undefined

    it 'supports add and field methods', ->
      form = new Form
        test: String

      form.field
        test2: String

      form.add
        test3: String

      expect(form.path 'test').to.be.an.instanceof FieldTypes.String
      expect(form.path 'test2').to.be.an.instanceof FieldTypes.String
      expect(form.path 'test3').to.be.an.instanceof FieldTypes.String

    it 'supports set & get methods', ->
      form = new Form
        nested:
          property: String
        'an.another.one': String
        simple:
          type: String

      obj =
        nested:
          property: 'This is a nested property'
        'an.another.one': 'String path nested property'
        simple: 432

      form.set obj

      expect(form.get 'simple').to.equal '432'
      expect(form.get 'nested.property').to.equal obj.nested.property
      expect(form.get 'an.another.one').to.equal obj['an.another.one']

  describe 'validation', ->
    it 'supports isValid method', ->
      form = new Form
        nested:
          property: String
        an:
          another:
            one: String
        simple:
          type: String
      ###
      form.populate
        nexted:
          property: 'This is a nested property'
      ###

  describe 'options', ->

    it 'supports options through constructor and form.option method', ->
      form = new Form({
        test: String}
        autoTrim: true
      )

      expect(form.option 'autoTrim').to.be.true

      form.option 'autoTrim', false

      expect(form.option 'autoTrim').to.be.false


