class JSONAPIError {
  constructor(args = {}) {
    let errors = Array.isArray(args.errors) ? args.errors : [];

    this.errors = errors.map(this.processError);
  }

  processError(error) {
    let object = {};

    if (error.id) { object.id = error.id; }
    if (error.status) { object.status = error.status; }
    if (error.code) { object.code = error.code; }
    if (error.title) { object.title = error.title; }
    if (error.detail) { object.detail = error.detail; }
    if (error.meta) { object.meta = error.meta; }

    if (error.links) {
      object.links = {};

      if (error.links.about) {
        object.links.about = error.links.about;
      }
    }

    if (error.source) {
      object.source = {};

      if (error.source.pointer) {
        object.source.pointer = error.source.pointer;
      }

      if (error.source.parameter) {
        object.source.parameter = error.source.parameter;
      }
    }

    return object;
  }

  clear() {
    this.errors = [];
  }

  count() {
    return this.errors.length;
  }

  parsePointer(pointer) {
    if (pointer === '/data') {
      return 'base';
    }

    if (pointer.indexOf('/data/attributes/') === 0) {
      return pointer.substring('/data/attributes/'.length, pointer.length);
    }

    return undefined;
  }

  extract() {
    return this.errors.reduce((object, error) => {
      if (error.source) {
        let key;

        if (error.source.parameter) {
          key = parameter;
        }

        if (!key && error.source.pointer) {
          key = this.parsePointer(error.source.pointer);
        }

        if (key) {
          object[key] = object[key] || [];
          object[key].push(error);
        }
      }
      return object;
    }, {});
  }

  add(error) {
    this.errors.push(this.processError(error));
  }
}

module.exports = JSONAPIError;
