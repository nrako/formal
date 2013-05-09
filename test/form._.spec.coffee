### global describe, it, beforeEach ###

_ = require 'lodash'
chai = require 'chai'
expect = chai.expect
Form = require '../lib/form'
FieldTypes = Form.FieldTypes
Field = require '../lib/field/field'

describe 'Form', ->

  describe 'form constructor and field path and definition', ->

    it 'supports dot notation for path accessors', ->
      form = new Form
        nested:
          property: String
          deep:
            property: Date
        'nested.string.property': String

      expect(form.path 'nested.property').to.be.an.instanceof FieldTypes.String
      expect(form.path 'nested.deep.property').to.be.an.instanceof FieldTypes.Date
      expect(form.path 'nested.string.property').to.be.an.instanceof FieldTypes.String
      expect(form.path 'nested.inexistant').to.be.undefined

    it 'supports add and field methods', ->
      form = new Form
        test: String

      form.field
        test2: String

      form.add
        test3: Date

      expect(form.path 'test').to.be.an.instanceof FieldTypes.String
      expect(form.path 'test2').to.be.an.instanceof FieldTypes.String
      expect(form.path 'test3').to.be.an.instanceof FieldTypes.Date

      fn = ->
        form.field
          type: 'unknown'

      expect(fn).to.throw(Error);

    it 'supports virtuals!', ->
      form = new Form
        price: Number
        cost: Number
        name:
          firstName: String
          familyName:
            type: String
            uppercase: true

      form.set
        price: 2325
        cost: 2100

      form.virtual('margin').get ->
        this.price - this.cost

      form.virtual('fullname').set (val) ->
        console.log this
        this.name =
          firstName: val.split(' ')[0]
          familyName: val.split(' ')[1]

      form.set
        'fullname': 'John Doe'

      expect(form.get 'margin').to.equal 2325 - 2100
      expect(form.get 'name.firstName').to.equal 'John'
      expect(form.get 'name.familyName').to.equal 'Doe'


  describe 'fieldtypes and casting', ->

    it 'supports different fieldtypes with casting', ->

      form = new Form
        string: String
        date: Date
        number: Number
        bool: Boolean

      obj =
        string: 'string'
        date: new Date
        number: 234
        bool: true
        unknown:
          sub: 'not set'

      form.set obj

      expect(form.get 'string').to.equal obj.string
      expect(form.get 'date').to.equal obj.date
      expect(form.get 'number').to.equal obj.number
      expect(form.get 'bool').to.equal obj.bool
      expect(form.get 'unknown.sub').to.be.undefined

      fn = ->
        form.field
          err:
            type: null

      expect(fn).to.throw TypeError

    it 'supports String', ->
      form = new Form
        1: String
        2: String
        3: String
        4: String
        5: String
        6:
          type: String
          default: 'string default'

      form.set
        1: 'value'
        2: 444
        3: true
        4: ['val',3]
        5: null

      expect(form.get '1').to.equal 'value'
      expect(form.get '2').to.equal '444'
      expect(form.get '3').to.equal 'true'
      expect(form.get '4').to.equal 'val,3'
      expect(form.get '5').to.be.null
      expect(form.get '6').to.equal form.path('6').default()

    it 'supports Number', ->
      form = new Form
        1: Number
        2: Number
        3: Number
        4: Number
        5: Number

      class Test
        constructor: () ->
        toString: () ->
          return '1'

      form.set
        1: 1
        2: 2.2
        3: '-3'
        4: []
        5: new Test

      expect(form.get '1').to.equal 1
      expect(form.get '2').to.equal 2.2
      expect(form.get '3').to.equal -3


    it 'supports Date', ->
      form = new Form
        1: Date
        2: Date
        3: Date

      now = new Date
      form.set
        1: now
        2: now.getTime()
        3: now.toString()

      expect(form.get '1').to.equal now
      # TODO make it works
      #expect(form.get '2'.toString()).to.deep.equal now.toString()
      #expect(form.get '3').to.equal now

      form.set
        1: 'not a date'

      #expect(fn).to.throw require '../lib/errors/cast'

    it 'supports Boolean', ->
      form = new Form
        1: Boolean
        2: Boolean
        3: Boolean
        4: Boolean
        5: Boolean
        6: Boolean
        7: Boolean
        8: Boolean

      form.set
        1: true
        2: 'false'
        3: 1
        4: 'adsf'
        5: null
        6: undefined
        7: 0
        8: '0'

      expect(form.get '1').to.equal true
      expect(form.get '2').to.equal false
      expect(form.get '3').to.equal true
      expect(form.get '4').to.equal true
      expect(form.get '5').to.equal null
      expect(form.get '6').to.be.null
      expect(form.get '7').to.equal false
      expect(form.get '8').to.equal false

  describe 'options', ->

    it 'supports options through constructor and form.option method', ->
      form = new Form
        test: String
      ,
        autoTrim: true

      expect(form.option 'autoTrim').to.be.true

      form.option 'autoTrim', false

      expect(form.option 'autoTrim').to.be.false

    it 'supports option.autoTrim', ->
      form = new Form
        test:String
      ,
        autoTrim: true

      form.set
        test: ' test   '

      expect(form.get 'test').to.equal 'test'

    it 'supports option.autoLocals', (done) ->
      form = new Form
        test: String
      ,
        autoLocals: false

      request =
        body:
          test: 'no locals'

      response =
        locals: {}

      cb = ->
        expect(response.locals.form).to.be.undefined

        done()

      form.middleware() request, response, cb

    it 'supports option.body', (done) ->
      form = new Form
        test: String
        test2: String
        test3: String
      ,
        dataSources: ['query', 'params']

      request =
        body:
          test: 'body'
        query:
          test2: 'query'
        params:
          test3: 'params'

      response =
        locals: {}

      cb = ->
        expect(request.form.get 'test').to.be.null
        expect(request.form.get 'test2').to.equal 'query'
        expect(request.form.get 'test3').to.equal 'params'

        done()

      form.middleware() request, response, cb

  describe 'setters and getters', ->

    it 'supports mongoose-like setters for string', ->
      form = new Form
        lower:
          type: String
          lowercase: true
        upper:
          type: String,
          uppercase: true
          trim: true

      form.set
        lower: 'UPPERcase'
        upper: '    lowerCASE   '

      expect(form.get 'lower').to.equal 'uppercase'
      expect(form.get 'upper').to.equal 'LOWERCASE'

    it 'supports all kind of setters', ->
      form = new Form
        set:
          type: Number
          set: (val) ->
            return val * -1

      form.set
        set: 23

      expect(form.get 'set').to.equal -23
      fn = ->
        form.path('set').set
          set: null
      expect(fn).to.throw TypeError

    it 'supports all kind of getters', ->
      form = new Form
        get:
          type: String
          get: (val) ->
            return val.toUpperCase()

      obj =
        get: 'ToUpperCase'

      form.set obj

      expect(form.getValue 'get').to.be.equal obj.get
      expect(form.get 'get').to.be.equal obj.get.toUpperCase()
      fn = ->
        form.path('get').get
          get: null
      expect(fn).to.throw TypeError


