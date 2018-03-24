const HttpAdapter = require('./http-adapter');
const {
  Serializer: JSONAPISerializer,
  Deserializer: JSONAPIDeserializer
} = require('jsonapi-serializer');

class JSONAPIAdapter extends HttpAdapter {
  constructor(args) {
    super(args);
  }

  serialize(model) {
    return new JSONAPISerializer(
      model.constructor.name.toLowerCase(),
      model.serializerOptions()
    ).serialize(model);
  }

  deserialize(json, opts) {
    return new JSONAPIDeserializer(opts).deserialize(json);
  }

  get(url, Model) {
    return this.request('GET', url, Model);
  }

  post(url, model) {
    return this.request('POST', url, model);
  }

  put(url, model) {
    return this.request('PUT', url, model);
  }

  patch(url, model) {
    return this.request('PATCH', url, model);
  }

  delete(url) {
    return this.request('DELETE', url);
  }

  request(method, url, model) {
    const payload = ['POST', 'PATCH', 'PUT'].indexOf(method) > -1 ? this.serialize(model) : null;

    return super.request(method, url, payload).then((response) => {
      if (!response.data) {
        return response;
      }

      const deserializerOptions = model.deserializerOptions || model.constructor.deserializerOptions;

      return this.deserialize(response.data, deserializerOptions).then((json) => {
        response.data = json;
        return response;
      });
    }).catch((response) => {
      throw response;
    });
  }
}

module.exports = JSONAPIAdapter;
