### global describe, it, beforeEach ###

_ = require 'lodash'
chai = require 'chai'
expect = chai.expect
Form = require '../lib/form'

describe 'Form route-middleware', ->
  it 'supports form.middleware', (done) ->
    middleware = Form
      title:
        type: String
        trim: true
        required: true
        attributes:
          placeholder: 'Title'
      publishOn: Date
      explicitContent:
        type: Number
        min: 6
        max: 18
      author:
        name: String
        email:
          type: String
          required: true
      tags:
        type: [String]
        set: (val) ->
          splits = val.split ','
          splits.forEach (val, i, ar) ->
            ar[i] = val.trim()

          return splits
      category:
        type: String
        enum: ['CatA', 'CatB']
      public:
        type: Boolean
        required: true

    request =
      body:
        title: ''
        publishOn: new Date # TODO should be a string
        tags: 'this,is, a,test '
        author:
          name: 'Doe'

    response =
      locals: {}

    cb = ->
      form = response.locals.form

      expect(form.title.data.attributes.placeholder).to.equal 'Title'
      expect(form.title.error).to.be.a 'string'
      expect(form.tags.value).to.deep.equal ['this','is','a','test']
      expect(form.author.name.value).to.equal 'Doe'

      done()

    # app.post('/url', form.express, function (req, res) {...})
    middleware request, response, cb
