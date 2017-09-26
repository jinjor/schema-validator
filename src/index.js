const schema = require('./schema.js');
const predefinedPlugin = require('./predefined.js');

const Schema = schema.createClass([]);
module.exports = predefinedPlugin(Schema);
