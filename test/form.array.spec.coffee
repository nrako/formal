### global describe, it, beforeEach ###

chai = require 'chai'
expect = chai.expect
Form = require '../lib/form'
FieldTypes = Form.FieldTypes
Field = require '../lib/field/field'

describe 'Field arrays', ->
  it 'supports arrays of strings', ->
    form = new Form
      'tags':
        type: [String]

    form.set
      tags: ['one', 2]

    expect(form.get 'tags').to.deep.equal ['one', '2']

    form.set 'tags.1', 'two'

    expect(form.get 'tags').to.deep.equal ['one', 'two']

  it 'supports arrays of number', ->
    form = new Form
      keys: [Number]

    form.set
      keys: [1, '2']

    expect(form.get 'keys').to.deep.equal [1, 2]

  it 'supports arrays of date', ->
    form = new Form
      dates: [Date]

    form.set
      dates: [new Date, new Date]

    expect(form.get('dates')[0]).to.be.an.instanceof Date

  it 'supports arrays of boolean', ->
    form = new Form
      bools: [Boolean]

    ar = [true, false]

    form.set
      bools: ar

    expect(form.get 'bools').to.deep.equal ar

  it 'supports simple casting of non array into array', ->
    form = new Form
      bools: [Boolean]

    form.set
      bools: true

    expect(form.get 'bools').to.deep.equal [true]

  it 'supports dot notation to access arrray\'s element', ->
    form = new Form
      ar: [String]

    form.set
      ar: ['one', 2]

    expect(form.get 'ar.1').to.equal '2'
    form.set
      'ar.1': 'two'

    expect(form.get 'ar.1').to.equal 'two'

  it 'supports default', ->
    form = new Form
      1: [Number]
      2:
        type: [Number]
        default: [1,2]

    form.path('1').default 1, 2

    expect(form.get '1').to.deep.equal [1, 2]
    expect(form.get '2').to.deep.equal [1, 2]




  #it 'supports brackets notation to access array\'s element' ->
  #  form.set 'ar[1]' 'two'



