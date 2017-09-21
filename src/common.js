class SchemaValidationError {
  constructor(message, isBreak) {
    this.message = message;
    this.isBreak = isBreak;
  }
  toError(name, value) {
    const stringValue = JSON.stringify(value, null, 2);
    return new Error(`${name} ${this.message}, but got ${stringValue}`);
  }
}

function reject(message, isBreak) {
  return new SchemaValidationError(message, isBreak);
}

module.exports = {
  SchemaValidationError: SchemaValidationError,
  reject: reject
};
