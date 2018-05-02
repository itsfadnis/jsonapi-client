const Errors = require('./jsonapi-error');
const { Serializer, Deserializer } = require('jsonapi-serializer');

class Base {
  static baseURL = '';

  static symbols = {
    errors: Symbol('errors'),
    persisted: Symbol('persisted'),
    links: Symbol('links'),
    relationship: Symbol('relationship')
  };

  constructor(args = {}) {
    this.id = !!args.id ? String(args.id) : Math.random().toString(36).substring(2, 15);
    this.errors = new Errors();
    this.persisted = !!args.id;
    this.links = args.links || {};
  }

  hasMany(Thing, array = []) {
    const things = array.map(object => new Thing(object));
    things[this.constructor.symbols.relationship] = Thing;
    return things;
  }

  belongsTo(Thing, object) {
    const thing = new Thing(object);
    thing[this.constructor.symbols.relationship] = Thing;
    return thing;
  }

  hasOne(Thing, object) {
    const thing = new Thing(object);
    thing[this.constructor.symbols.relationship] = Thing;
    return thing;
  }

  get errors() {
    return this[this.constructor.symbols.errors];
  }

  set errors(errors) {
    this[this.constructor.symbols.errors] = new Errors(errors);
  }

  get persisted() {
    return this[this.constructor.symbols.persisted];
  }

  set persisted(persisted) {
    this[this.constructor.symbols.persisted] = persisted;
  }

  get links() {
    return this[this.constructor.symbols.links];
  }

  set links(links) {
    this[this.constructor.symbols.links] = links;
  }

  isRelationship(key) {
    return this.hasOwnProperty(key)
      && Object.getOwnPropertySymbols(this[key] || {}).indexOf(
        this.constructor.symbols.relationship
      ) > -1;
  }

  isAttribute(key) {
    return this.hasOwnProperty(key)
      && key !== 'id'
      && typeof key !== 'function'
      && Object.getOwnPropertySymbols(this[key] || {}).indexOf(
        this.constructor.symbols.relationship
      ) === -1;
  }

  static keysForAttributes() {
    const model = this.new();
    let keys = [];
    for (const key in model) {
      if (this.prototype.isAttribute.call(model, key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  static keysForRelationships() {
    const model = this.new();
    let keys = [];
    for (const key in model) {
      if (this.prototype.isRelationship.call(model, key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  attributes() {
    let object = {};
    for (const key in this) {
      if (this.isAttribute(key)) {
        object[key] = this[key];
      }
    }
    return object;
  }

  static urlParams() {
    return this.baseURL.match(/:\w+/g);
  }

  static constructBaseURL(args = {}) {
    const urlParams = this.urlParams();
    if (!urlParams) return this.baseURL;

    let url = this.baseURL;
    urlParams.forEach((item) => {
      url = url.replace(item, args[item.substring(1)]);
    });

    return url;
  }

  constructBaseURL(args) {
    return this.constructor.constructBaseURL(args);
  }

  serializerOptions() {
    let object = {};

    const keysForAttributes = this.constructor.keysForAttributes();
    const keysForRelationships = this.constructor.keysForRelationships();

    object.attributes = [
      ...keysForAttributes,
      ...keysForRelationships
    ];

    keysForRelationships.forEach((key) => {
      const Relationship = this[key][this.constructor.symbols.relationship];
      object[key] = {
        ref: 'id',
        attributes: Relationship.keysForAttributes()
      };
    });

    return object;
  }

  static deserializerOptions = {
    keyForAttribute: 'camelCase'
  };

  serialize() {
    return new Serializer(
      this.constructor.name.toLowerCase(),
      this.serializerOptions()
    ).serialize(this);
  }

  static deserialize(response) {
    return new Deserializer(this.deserializerOptions)
      .deserialize(response)
      .then((data) => {
        if (Array.isArray(data)) {
          return data.map(object => new this(object));
        }
        return new this(data);
      });
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
      .get(`${ this.constructBaseURL(args) }/${ id }`)
      .then(({ data }) => this.deserialize(data))
      .then(object => object)
      .catch((err) => { throw err; });
  }

  static fetchAll(args = {}) {
    return this.adapter
      .get(`${ this.constructBaseURL(args) }`)
      .then(({ data }) => this.deserialize(data))
      .then(array => array)
      .catch((err) => { throw err; });
  }

  _create() {
    return this.constructor.adapter
      .post(this.constructBaseURL(), this.serialize())
      .then(({ data }) => this.constructor.deserialize(data))
      .then(object => object)
      .catch((err) => {
        if (err.status === 422) this._process422Response(err);
        throw err;
      });
  }

  _update() {
    return this.constructor.adapter
      .patch(`${ this.constructBaseURL() }/${ this.id }`, this.serialize())
      .then(({ data }) => this.constructor.deserialize(data))
      .then(object => object)
      .catch((err) => {
        if (err.status === 422) this._process422Response(err);
        throw err;
      });
  }

  save() {
    if (!this.valid) return Promise.reject(new Error('Unprocessable Entity'));

    return this.persisted ? this._update() : this._create();
  }

  static destroy(id, args = {}) {
    return this.adapter
      .delete(`${ this.constructBaseURL(args) }/${ id }`)
      .catch((err) => { throw err; });
  }

  destroy() {
    return this.constructor.adapter
      .delete(`${ this.constructor.constructBaseURL() }/${ this.id }`)
      .catch((err) => { throw err; });
  }

  request(method, url, data) {
    return this.constructor.adapter.request(method, url, data);
  }

  _process422Response(response) {
    this.errors = new Errors(response.data);
  }

  static new(args = {}) {
    return new this(args);
  }
}

module.exports = Base;
