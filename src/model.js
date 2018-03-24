const Errors = require('./jsonapi-error');

class Base {
  static baseURL = '';

  constructor(args = {}) {
    this.id = !!args.id ? String(args.id) : Math.random().toString(36).substring(2, 15);
    this._errors = new Errors();
    this._persisted = !!args.id;
  }

  static _urlParams() {
    return this.baseURL.match(/:[a-z_]+/g);
  }

  static _constructBaseUrl(args) {
    const urlParams = this._urlParams();
    if (!urlParams) return this.baseURL;

    let url = this.baseURL;
    urlParams.forEach((item) => {
      url = url.replace(item, args[item.substring(1)]);
    });

    return url;
  }

  serializerOptions() {
    let object = {};

    const attributes = this.attributes;
    const relationships = this.relationships;

    object.attributes = [
      ...Object.keys(attributes),
      ...Object.keys(relationships)
    ];

    for (const key in relationships) {
      if (relationships.hasOwnProperty(key)) {
        object[key] = {
          ref: 'id',
          attributes: relationships[key].attributes
        };
      }
    }

    return object;
  }

  static deserializerOptions = {
    keyForAttribute: 'camelCase'
  };

  get baseURL() {
    return this.constructor._constructBaseUrl();
  }

  _isPrivate(member) {
    return member.charAt(0) === '_';
  }

  _isAttribute(key) {
    return this.hasOwnProperty(key)
      && !this._isPrivate(key)
      && typeof this[key] !== 'function'
      && typeof this[key] !== 'object';
  }

  _isRelationship(key) {
    return this.hasOwnProperty(key)
      && !this._isPrivate(key)
      && typeof this[key] === 'object';
  }

  get attributes() {
    let attributes = {};

    for (let key in this) {
      if (this._isAttribute(key)) {
        attributes[key] = this[key];
      }
    }

    return attributes;
  }

  get relationships() {
    let relationships = {};

    for (let key in this) {
      if (this._isRelationship(key)) {
        relationships[key] = this[key];
      }
    }

    return relationships;
  }

  get errors() {
    return this._errors;
  }

  get valid() {
    this.errors.clear();
    this.validate();
    return this.errors.count() === 0;
  }

  // Run model validations in this hook
  // Ex:
  // class Foo extends Base {
  //   validate() {
  //     if (isBlank(this.name)) {
  //       this.errors.add({
  //         code: 'blank',
  //         source: {
  //           pointer: '/data/attributes/name'
  //         }
  //       });
  //     }
  //   }
  // }
  validate() {}

  static fetch(id, args = {}) {
    return this.adapter
      .get(`${ this._constructBaseUrl(args) }/${ id }`, this)
      .then(({ data }) => this.new(data))
      .catch((err) => { throw err; });
  }

  static fetchAll(args = {}) {
    return this.adapter
      .get(`${ this._constructBaseUrl(args) }`, this)
      .then(({ data }) => data.map((object) => this.new(object)))
      .catch((err) => { throw err; });
  }

  _create() {
    return this.constructor.adapter
      .post(this.baseURL, this)
      .then(({ data }) => this.constructor.new(data))
      .catch((err) => {
        if (err.code === 422) this._process422Response(err);
        throw err;
      });
  }

  _update() {
    return this.constructor.adapter
      .patch(`${ this.baseURL }/${ this.id }`, this)
      .then(({ data }) => this.constructor.new(data))
      .catch((err) => {
        if (err.code === 422) this._process422Response(err);
        throw err;
      });
  }

  save() {
    return this._persisted ? this._update() : this._create();
  }

  static destroy(id, args = {}) {
    return this.adapter
      .delete(`${ this._constructBaseUrl(args) }/${ id }`)
      .catch((err) => { throw err; });
  }

  destroy() {
    return this.constructor.adapter
      .delete(`${ this.baseURL }/${ this.id }`)
      .catch((err) => { throw err; });
  }

  request(method, url, data) {
    return this.constructor.adapter.request(method, url, data);
  }

  _process422Response(response) {
    this._errors = new Errors(response.data);
  }

  static new(args = {}) {
    return new this(args);
  }
}

module.exports = Base;
