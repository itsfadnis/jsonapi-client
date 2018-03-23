const JSONAPIAdapter = require('../src/jsonapi-adapter');
const HttpAdapter = require('../src/http-adapter');
const JSONAPISerializer = require('jsonapi-serializer');

jest.mock('../src/http-adapter');

beforeEach(() => {
  HttpAdapter.mockClear();
});

describe('JSONAPIAdapter', () => {
  describe('instantiation', () => {
    test('it works properly', () => {
      const adapter = new JSONAPIAdapter({
        namespace: '/api/v2',
        baseURL: 'https://foo.com',
        headers: {
          authorization: 'sometoken'
        },
        deserializerOptions: {
          keyForAttribute: 'camelCase'
        }
      });
      expect(HttpAdapter).toHaveBeenCalledWith({
        namespace: '/api/v2',
        baseURL: 'https://foo.com',
        headers: {
          authorization: 'sometoken'
        }
      });
      expect(adapter.deserializerOptions).toEqual({
        keyForAttribute: 'camelCase'
      });
    });
  });

  describe('#deserialize(object, opts)', () => {
    test('it returns the deserialized object', () => {
      const adapter = new JSONAPIAdapter();

      const object = {
        data: {
          id: '123',
          type: 'users',
          attributes: {
            'first-name': 'John',
            'last-name': 'Doe'
          }
        }
      };

      const options = {
        keyForAttribute: 'camelCase'
      };

      const returnValue = adapter.deserialize(object, options);

      expect(JSONAPISerializer.Deserializer.mock.instances.length).toBe(1);
      expect(JSONAPISerializer.Deserializer).toHaveBeenCalledWith(options);
      expect(JSONAPISerializer.Deserializer.prototype.deserialize).toHaveBeenCalledWith(object);
      expect(returnValue).toEqual({
        id: '123',
        firstName: 'John',
        lastName: 'Doe'
      });
    });
  });
});
