const sv = require('../src/index.js');
const chai = require('chai');
const assert = chai.assert;

describe('schema-validator', function() {
  describe('#validate()', function() {
    it('should validate number', function() {
      assert.equal(0, sv.number.validate(0));
      assert.equal(1, sv.number.validate(1));
      assert.equal(undefined, sv.number.validate());
      assert.equal(Infinity, sv.number.validate(Infinity));
      assert.throws(() => sv.number.validate(null));
      assert.throws(() => sv.number.validate({}));
      assert.throws(() => sv.number.validate(''));
      assert.throws(() => sv.number.validate(() => {}));
      //
      assert.throws(() => sv.number.required().validate());
    });
    it('should validate min and max', function() {
      assert.equal(1, sv.number.min(1).validate(1));
      assert.throws(() => sv.number.min(1).validate(0));
      assert.equal(1, sv.number.max(1).validate(1));
      assert.throws(() => sv.number.max(1).validate(2));
      assert.throws(() => sv.number.min(0).max(1).validate(-1));
    });
    it('should validate array', function() {
      assert.deepEqual([], sv.array(sv.number).validate([]));
      assert.deepEqual([], sv.array(sv.any).validate([]));
      assert.deepEqual([], sv.array().validate([]));
      assert.deepEqual([0], sv.array(sv.number).validate([0]));
      assert.deepEqual([0], sv.array(sv.number.max(1)).validate([0]));
      assert.deepEqual([''], sv.array(sv.string).validate(['']));
      assert.deepEqual([1], sv.array().validate([1]));
      assert.deepEqual(['', 1], sv.array().validate(['', 1]));

      assert.throws(() => sv.array(sv.number).validate(['1']));
      assert.throws(() => sv.array(sv.number).validate(['1', 2]));
      assert.throws(() => sv.array(sv.number.min(3)).validate([5, 2, 4]));
    });
  });
});
