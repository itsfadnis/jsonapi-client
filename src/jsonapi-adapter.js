const HttpAdapter = require('./http-adapter');
const {
  Serializer: JSONAPISerializer,
  Deserializer: JSONAPIDeserializer
} = require('jsonapi-serializer');
const Inflector = require('inflected');

class JSONAPIAdapter extends HttpAdapter {
  constructor(args = {}) {
    super(args);
  }

  _serializedRelationships(model) {
    const relationships = model.relationships;
    let serializedRelationships = {};
    let attributes;

    for (let key in relationships) {
      if (relationships.hasOwnProperty(key)) {
        attributes = relationships[key].attributes;

        serializedRelationships[key] = {
          ref: 'id',
          attributes: Object.keys(attributes)
        };
      }
    }

    return serializedRelationships;
  }

  _serializerOptions(model) {
    let schema = {};
    let { ...attributes } = model.attributes;
    let relationships = this._serializedRelationships(model);

    schema.attributes = Object.keys(attributes).concat(Object.keys(relationships));
    return Object.assign({}, schema, relationships);
  }

  _collectionName(model) {
    return String(Inflector.pluralize(model.constructor.name)).toLowerCase();
  }

  serialize(model) {
    return new JSONAPISerializer(this._collectionName(model), this._serializerOptions(model)).serialize(model);
  }

  deserialize(json, opts = { keyForAttribute: 'camelCase' }) {
    return !!json ? new JSONAPIDeserializer(opts).deserialize(json) : Promise.resolve(null);
  }

  request(method, url, data = {}) {
    const payload = ['POST', 'PATCH', 'PUT'].indexOf(method) > -1 ? this.serialize(data) : null;

    return new Promise((resolve, reject) => {
      super.request(method, url, payload).then((response) => {
        this.deserialize(response.data).then((json) => {
          response.data = json;
          resolve(response);
        });
      }).catch((response) => {
        reject(response);
      });
    });
  }
}

module.exports = JSONAPIAdapter;
