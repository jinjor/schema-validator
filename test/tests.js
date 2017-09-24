const chai = require('chai');
const assert = chai.assert;
const SV = require('../src/index.js');
const schema = require('../src/schema.js');

const verbose = process.argv[3] === '-v'; // npm test -- -v

const log = verbose ? function() {
  console.log.apply(console, arguments);
} : () => {};

const throws = (f, name, valueString) => {
  let value = null;
  try {
    value = f();
  } catch (e) {
    if (!(e instanceof schema.SchemaValidatorError)) {
      throw new Error('unknown error was thrown: ' + e);
    }
    if (name && !e.message.startsWith(name)) {
      throw new Error(`error message does not start with "${name}": ` + e.message);
    }
    if (valueString && !e.message.endsWith(valueString)) {
      throw new Error(`error message does not end with "${valueString}": ` + e.message);
    }
    log('    ' + e.message);
    return;
  }
  throw new Error('unexpectedly succeeded: ' + JSON.stringify(value, null, 2));
}

const sv = SV({
  isHello() {
    return this.then(value => (value === 'hello') ? value : this.reject('should be "hello"'));
  }
});

describe('schema-validator', function() {
  afterEach(function() {
    log();
  });
  it('should validate number', function() {
    assert.equal(0, sv.number().validate(0));
    assert.equal(1, sv.number().validate(1));
    assert.equal(Infinity, sv.number().validate(Infinity));
    throws(() => sv.number().validate(null));
    throws(() => sv.number().validate({}));
    throws(() => sv.number().validate(''));
    throws(() => sv.number().validate(() => {}));
  });
  it('should validate min and max', function() {
    assert.equal(1, sv.number().min(1).validate(1));
    throws(() => sv.number().min(1).validate(0));
    assert.equal(1, sv.number().max(1).validate(1));
    throws(() => sv.number().max(1).validate(2));
    throws(() => sv.number().min(0).max(1).validate(-1));
  });
  it('should validate string', function() {
    assert.equal('', sv.string().validate(''));
    assert.equal('hello', sv.string().validate('hello'));
    assert.equal('hello', sv.string().minLength(5).validate('hello'));
    assert.equal('hello', sv.string().maxLength(5).validate('hello'));
    throws(() => sv.string().minLength(6).validate('hello'));
    throws(() => sv.string().maxLength(4).validate('hello'));
  });
  it('should validate array', function() {
    assert.deepEqual([], sv.array().items(sv.number()).validate([]));
    assert.deepEqual([], sv.array().validate([]));
    assert.deepEqual([0], sv.array().items(sv.number()).validate([0]));
    assert.deepEqual([0], sv.array().items(sv.number().max(1)).validate([0]));
    assert.deepEqual([''], sv.array().items(sv.string()).validate(['']));
    assert.deepEqual([1], sv.array().validate([1]));
    assert.deepEqual(['', 1], sv.array().validate(['', 1]));

    throws(() => sv.array().items(sv.number()).validate(['1']));
    throws(() => sv.array().items(sv.number()).validate(['1', 2]));
    throws(() => sv.array().items(sv.number().min(3)).validate([5, 2, 4]));
  });
  it('should validate field', function() {
    const schema = sv.object().field('a', sv.number());
    assert.deepEqual({
      a: 1
    }, schema.validate({
      a: 1
    }));
    throws(() => schema.validate());
    throws(() => schema.validate(null));
    throws(() => schema.validate({}));
    throws(() => schema.validate({
      a: ''
    }));
    throws(() => schema.validate({
      a: '1'
    }));
  });
  it('should validate optional field', function() {
    const schema = sv.object()
      .field('a', sv.number())
      .field('b', sv.number(), sv.key('a', sv.equal(1)));
    assert.deepEqual({
      a: 1,
      b: 10
    }, schema.validate({
      a: 1,
      b: 10
    }));
    assert.deepEqual({
      a: 0,
      b: 'a'
    }, schema.validate({
      a: 0,
      b: 'a'
    }));
    throws(() => schema.validate({
      a: 1,
    }));
    throws(() => schema.validate({
      a: 1,
      b: 'a'
    }));
  });
  it('should validate object', function() {
    const schema = sv.object()
      .field('a', sv.number().then(v => v * 2))
      .field('b', sv.string().then(v => v.toUpperCase()))
      .field('c', sv.array().items(sv.number()))
      .field('d', sv.object(), sv.key('c', sv.minLength(3)))
      .field('e', sv.boolean().default_(true))
      .when(sv.key('e', sv.truthy()),
        sv.field('f', sv.number())
        .field('g', sv.number().default_(100))
      )

    assert.deepEqual({
      a: 2,
      b: 'FOO',
      c: [10, 20, 30],
      d: {},
      e: true,
      f: 10,
      g: 100
    }, schema.validate({
      a: 1,
      b: 'foo',
      c: [10, 20, 30],
      d: {},
      f: 10
    }));
  });
  it('should validate when', function() {
    assert.equal(1, sv.when(sv.number(), sv.min(1)).validate(1));
    throws(() => sv.when(sv.number(), sv.min(1)).validate(0));
    assert.equal(1, sv.when(sv.string(), sv.min(1)).validate(1));
    throws(() => sv.when(sv.number(), sv.min(1)).string().validate(1));
  });
  it('should validate required', function() {
    assert.equal(0, sv.number().validate(0));
    throws(() => sv.number().validate());
    assert.equal(0, sv.number().required().validate(0));
    assert.equal(0, sv.required().number().validate(0));
    throws(() => sv.number().required().validate());
    throws(() => sv.number().required().validate('a'));
    throws(() => sv.required().number().validate());
  });
  it('should validate default', function() {
    assert.equal(0, sv.default_(1).number().validate(0));
    assert.equal(0, sv.number().default_(1).validate(0));
    assert.equal(1, sv.default_(1).number().validate());
    assert.equal(1, sv.number().default_(1).validate());
  });
  it('should validate complex case', function() {
    const retrySchema = sv.try_(sv.number().then(value => ({
        count: value
      })))
      .field('count', sv.integer().min(1))
      .field('interval', sv.number().default_(0));
    const schema = sv.object().field('retry', retrySchema);
    assert.deepEqual({
      retry: {
        count: 2,
        interval: 0
      }
    }, schema.validate({
      retry: 2
    }, 'options'));
    assert.deepEqual({
      retry: {
        count: 2,
        interval: 5
      }
    }, schema.validate({
      retry: {
        count: 2,
        interval: 5
      }
    }, 'options'));
  });
  it('should read custom plugin', function() {
    assert.equal('hello', sv.isHello().validate('hello'));
    throws(() => sv.isHello().validate('bye'));
  });
  it('should throw correct error', function() {
    throws(() => sv.number().validate(undefined, 'foo'), 'foo', 'undefined');
    throws(() => sv.number().required().validate(undefined, 'foo'), 'foo', 'undefined');
    throws(() => sv.number().required().validate(undefined, 'foo'), 'foo', 'undefined');
    throws(() => sv.when(sv.string(), sv.number()).validate('', 'foo'), 'foo', '""');
    throws(() => sv.array().minLength(1).validate([], 'foo'), 'foo.length', '0');
    throws(() => sv.array().items(sv.string()).validate([1], 'foo'), 'foo[0]', '1');
    throws(() => sv.array().items(sv.string().minLength(1)).validate(['1', ''], 'foo'), 'foo[1].length', '0');
    throws(() => sv.key('a', sv.string()).validate({
      a: 1
    }, 'foo'), 'foo.a', '1');
    throws(() => sv.object().check(sv.key('b', sv.string())).validate({
      b: 1
    }, 'foo'), 'foo.b', '1');
    throws(() => sv.object().field('c', sv.string()).validate({
      c: 1
    }, 'foo'), 'foo.c', '1');
  });
});
