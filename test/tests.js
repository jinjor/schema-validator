const chai = require('chai');
const assert = chai.assert;
const SV = require('../src/index.js');
const breakable = require('../src/breakable.js');
const Reject = breakable.Reject;
const Break = breakable.Break;

const verbose = process.argv[3] === '-v'; // npm test -- -v

const log = verbose ? function() {
  console.log.apply(console, arguments);
} : () => {};

const throws = f => {
  let value = null;
  try {
    value = f();
  } catch (e) {
    if (e instanceof Reject) {
      throw new Error('unexpectedly throwed Reject');
    }
    if (e instanceof Break) {
      throw new Error('unexpectedly throwed Break');
    }
    log('    ' + e.message);
    return;
  }
  throw new Error('unexpectedly succeeded: ' + JSON.stringify(value, null, 2));
}

const sv = SV({
  isHello() {
    return this.last({
      doc: 'should be "hello"',
      _validate: value => (value === 'hello') ? value : this.reject()
    });
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
      .field('b', sv.number(), sv.key('a').equal(1));
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
    const schema = sv.object().name('options')
      .field('a', sv.number().then(v => v * 2))
      .field('b', sv.string().then(v => v.toUpperCase()))
      .field('c', sv.array().items(sv.number()))
      .field('d', sv.object(), sv.key('c').minLength(3))
      .field('e', sv.boolean().default(true))
      .when(sv.key('e').truthy(),
        sv.field('f', sv.number())
        .field('g', sv.number().default(100))
      );

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
  it('should validate required', function() {
    assert.equal(0, sv.number().validate(0));
    assert.equal(undefined, sv.string().required(false).validate(undefined));
    assert.equal(undefined, sv.string().optional().validate(undefined));
    throws(() => sv.number().validate());
    assert.equal(0, sv.number().required().validate(0));
    assert.equal(0, sv.required().number().validate(0));
    throws(() => sv.number().required().validate());
    throws(() => sv.number().required().validate('a'));
    throws(() => sv.required().number().validate());
  });
  it('should validate default', function() {
    assert.equal(0, sv.default(1).number().validate(0));
    assert.equal(0, sv.number().default(1).validate(0));
    assert.equal(1, sv.default(1).number().validate());
    assert.equal(1, sv.number().default(1).validate());
  });
  it('should read custom plugin', function() {
    assert.equal('hello', sv.isHello().validate('hello'));
    throws(() => sv.isHello().validate('bye'));
  });
  it('should generate doc', function() {
    const indent = '    ';
    log(sv.number().doc(indent));
    log();
    log(sv.array().items(sv.number().lt(100)).doc(indent));
    log();
    log(sv.object().name('options')
      .field('a', sv.number().then(v => v * 2))
      .field('b', sv.string().then(v => v.toUpperCase()))
      .doc(indent)
    );
  });
});
