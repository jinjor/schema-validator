class SchemaValidationError {
  constructor(message) {
    this.message = message;
  }
  toError(name, value) {
    value = JSON.stringify(value, null, 2);
    return new Error(name + ' ' + this.message + ', but got ' + value);
  }
}

const reject = message => new SchemaValidationError(message);

module.exports = {
  SchemaValidationError: SchemaValidationError,
  reject: reject
};
