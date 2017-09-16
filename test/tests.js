const sv = require('../src/index.js');
const chai = require('chai');
const assert = chai.assert;

describe('schema-validator', function() {
  describe('#validate()', function() {
    it('should validate number', function() {
      assert.equal(0, sv.number.validate(0));
      assert.equal(1, sv.number.validate(1));
      assert.equal(Infinity, sv.number.validate(Infinity));
      assert.throws(() => sv.number.validate());
      assert.throws(() => sv.number.validate(null));
      assert.throws(() => sv.number.validate({}));
      assert.throws(() => sv.number.validate(''));
      assert.throws(() => sv.number.validate(() => {}));
    });
  });
});
