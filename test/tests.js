const SV = require('../src/index.js');
const chai = require('chai');
const assert = chai.assert;
const sv = SV({
  plugins: [{
    isHello: schema => _ => schema.then(value => {
      return (value === 'hello') ? value : new Error('value is not hello :(');
    }),
  }]
});

describe('schema-validator', function() {
  describe('#validate()', function() {
    it('should validate number', function() {
      assert.equal(0, sv.number().validate(0));
      assert.equal(1, sv.number().validate(1));
      assert.equal(Infinity, sv.number().validate(Infinity));
      assert.throws(() => sv.number().validate(null));
      assert.throws(() => sv.number().validate({}));
      assert.throws(() => sv.number().validate(''));
      assert.throws(() => sv.number().validate(() => {}));
    });
    it('should validate min and max', function() {
      assert.equal(1, sv.number().min(1).validate(1));
      assert.throws(() => sv.number().min(1).validate(0));
      assert.equal(1, sv.number().max(1).validate(1));
      assert.throws(() => sv.number().max(1).validate(2));
      assert.throws(() => sv.number().min(0).max(1).validate(-1));
    });
    it('should validate array', function() {
      assert.deepEqual([], sv.array(sv.number()).validate([]));
      assert.deepEqual([], sv.array().validate([]));
      assert.deepEqual([0], sv.array(sv.number()).validate([0]));
      assert.deepEqual([0], sv.array(sv.number().max(1)).validate([0]));
      assert.deepEqual([''], sv.array(sv.string()).validate(['']));
      assert.deepEqual([1], sv.array().validate([1]));
      assert.deepEqual(['', 1], sv.array().validate(['', 1]));

      assert.throws(() => sv.array(sv.number()).validate(['1']));
      assert.throws(() => sv.array(sv.number()).validate(['1', 2]));
      assert.throws(() => sv.array(sv.number().min(3)).validate([5, 2, 4]));
    });
    it('should validate object', function() {
      const schema = sv.object([
        _ => sv.field('a', sv.number().then(v => v * 2)),
        _ => sv.field('b', sv.string().then(v => v.toUpperCase())),
        _ => sv.field('c', sv.array(sv.number())),
        o => o.c ? sv.field('d', sv.object()) : sv.any(),
        _ => sv.field('e', sv.boolean().default(true)),
        o => o.e ? sv.object([
          _ => sv.field('f', sv.number()),
          _ => sv.field('g', sv.number().default(100)),
        ]) : sv.any()
      ]);
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
      assert.throws(() => sv.number().validate());
      assert.equal(0, sv.number().required().validate(0));
      assert.equal(0, sv.required().number().validate(0));
      assert.throws(() => sv.number().required().validate());
      assert.throws(() => sv.required().number().validate());
    });
    it('should validate default', function() {
      assert.equal(0, sv.default(1).number().validate(0));
      assert.equal(0, sv.number().default(1).validate(0));
      assert.equal(1, sv.default(1).number().validate());
      assert.equal(1, sv.number().default(1).validate());
    });
    it('should read custom plugin', function() {
      assert.equal('hello', sv.isHello().validate('hello'));
      assert.throws(() => sv.isHello().validate('bye'));
    });
  });
});
