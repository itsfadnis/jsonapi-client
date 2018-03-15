const Inflector = require('inflected');

class Errors {
  constructor(args = {}) {
    this._errors = {};
    this._jsonErrors = args.data && args.data.errors ? args.data.errors : [];
  }

  get count() {
    return Object.keys(this._errors).length;
  }

  clear() {
    this._errors = {};
    this._jsonErrors = [];
  }

  add(attribute, code, details = null) {
    const attr = Inflector.camelize(Inflector.underscore(attribute), false);
    this._errors[attr] = this._errors[attr] || [];
    const errorCodes = this._errors[attr].map((error) => error.code);
    if (errorCodes.indexOf(code) === -1) {
      this._errors[attr].push({
        code,
        details
      });
    }
  }

  generate() {
    this._jsonErrors.forEach((error) => {
      const attribute = [];

      if (error.source.pointer === '/data') {
        attribute.push('base');
      } else {
        const pointer = error.source.pointer.split('/data');

        pointer.forEach((i) => {
          const m = i.match(/\/(attributes|relationships|)\/([a-z0-9\-]+)/);
          if (m) {
            attribute.push(m[2]);
          }
        });
      }
      this.add(attribute.join('.'), error.code, error.details);
    });
  }

  get all() {
    return this._errors;
  }
}

module.exports = Errors;
