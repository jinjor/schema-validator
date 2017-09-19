class SchemaValidationError {
  constructor(message) {
    this.message = message;
  }
  toError(name, value) {
    const stringValue = JSON.stringify(value, null, 2);
    return new Error(`${name} ${this.message}, but got ${stringValue}`);
  }
}

function reject(message) {
  return new SchemaValidationError(message);
}

module.exports = {
  SchemaValidationError: SchemaValidationError,
  reject: reject
};
