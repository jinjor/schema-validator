class Reject {
  constructor(message) {
    this.message = message;
  }
  toError(name, value) {
    const stringValue = JSON.stringify(value, null, 2);
    return new Error(`${name} ${this.message}, but got ${stringValue}`);
  }
}
class Break {
  constructor(value) {
    this.value = value;
  }
}

module.exports = {
  Reject: Reject,
  Break: Break
};
