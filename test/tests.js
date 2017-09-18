const SV = require('../src/index.js');
const chai = require('chai');
const assert = chai.assert;
const sv = SV({
  isHello: schema => _ => schema.check(value => {
    if (value !== 'hello') {
      return 'value is not hello :(';
    }
  })
});
const throws = f => {
  let value = null;
  try {
    value = f();
  } catch (e) {
    console.log('      ' + e.message);
    return;
  }
  throw new Error('unexpectedly succeeded: ' + JSON.stringify(value, null, 2));
}

describe('schema-validator', function() {
  describe('#validate()', function() {
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
    it('should validate object', function() {
      const schema = sv.object()
        .field('a', sv.number().then(v => v * 2))
        .field('b', sv.string().then(v => v.toUpperCase()))
        .field('c', sv.array().items(sv.number()))
        .field('d', sv.object(), o => o.c.length > 3)
        .field('e', sv.boolean().default(true))
        .field('f', sv.number(), o => o.e)
        .field('g', sv.number().default(100), o => o.e)
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
      throws(() => sv.number().validate());
      assert.equal(0, sv.number().required().validate(0));
      assert.equal(0, sv.required().number().validate(0));
      throws(() => sv.number().required().validate());
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
  });
});
