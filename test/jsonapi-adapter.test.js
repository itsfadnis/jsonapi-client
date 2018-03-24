const JSONAPIAdapter = require('../src/jsonapi-adapter');
const HttpAdapter = require('../src/http-adapter');
const JSONAPISerializer = require('jsonapi-serializer');

describe('JSONAPIAdapter', () => {
  describe('instantiation', () => {
    test('it works properly', () => {
      jest.doMock('../src/http-adapter', () => {
        class FakeHttpAdapter {
          constructor(args) {
            expect(args).toEqual({
              namespace: '/api/v2',
              baseURL: 'https://foo.com',
              headers: {
                authorization: 'sometoken'
              }
            });
          }
        }
        return FakeHttpAdapter;
      });

      // eslint-disable-next-line no-new
      new JSONAPIAdapter({
        namespace: '/api/v2',
        baseURL: 'https://foo.com',
        headers: {
          authorization: 'sometoken'
        }
      });

      jest.unmock('../src/http-adapter');
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

  describe('#serialize(model)', () => {
    test('it returns the serialized model', () => {
      const adapter = new JSONAPIAdapter();

      // Mock model
      class User {
        serializerOptions() {
          return {
            attributes: ['firstName', 'lastName']
          };
        }
      }

      const user = new User('John', 'Doe');

      const returnValue = adapter.serialize(user);

      expect(JSONAPISerializer.Serializer.mock.instances.length).toBe(1);
      expect(JSONAPISerializer.Serializer).toHaveBeenCalledWith('user', {
        attributes: ['firstName', 'lastName']
      });

      expect(JSONAPISerializer.Serializer.prototype.serialize).toHaveBeenCalledWith(user);
      expect(returnValue).toEqual({
        data: {
          type: 'users',
          id: '123',
          attributes: {
            'first-name': 'John',
            'last-name': 'Doe'
          }
        }
      });
    });
  });

  describe('#get(url, Model)', () => {
    test('it calls & returns #request(method, url, model) with the right params', () => {
      const adapter = new JSONAPIAdapter();
      const spy = jest.spyOn(adapter, 'request').mockReturnValue('something');

      expect(adapter.get('/foo', 'bar')).toEqual('something');
      expect(spy).toHaveBeenCalledWith('GET', '/foo', 'bar');

      spy.mockRestore();
    });
  });

  describe('#post(url, model)', () => {
    test('it calls & returns #request(method, url, model) with the right params', () => {
      const adapter = new JSONAPIAdapter();
      const spy = jest.spyOn(adapter, 'request').mockReturnValue('something');

      expect(adapter.post('/foo', 'bar')).toEqual('something');
      expect(spy).toHaveBeenCalledWith('POST', '/foo', 'bar');

      spy.mockRestore();
    });
  });

  describe('#put(url, model)', () => {
    test('it calls & returns #request(method, url, model) with the right params', () => {
      const adapter = new JSONAPIAdapter();
      const spy = jest.spyOn(adapter, 'request').mockReturnValue('something');

      expect(adapter.put('/foo', 'bar')).toEqual('something');
      expect(spy).toHaveBeenCalledWith('PUT', '/foo', 'bar');

      spy.mockRestore();
    });
  });

  describe('#patch(url, model)', () => {
    test('it calls & returns #request(method, url, model) with the right params', () => {
      const adapter = new JSONAPIAdapter();
      const spy = jest.spyOn(adapter, 'request').mockReturnValue('something');

      expect(adapter.patch('/foo', 'bar')).toEqual('something');
      expect(spy).toHaveBeenCalledWith('PATCH', '/foo', 'bar');

      spy.mockRestore();
    });
  });

  describe('#delete(url)', () => {
    test('it calls & returns #request(method, url, model) with the right params', () => {
      const adapter = new JSONAPIAdapter();
      const spy = jest.spyOn(adapter, 'request').mockReturnValue('something');

      expect(adapter.delete('/foo', 'bar')).toEqual('something');
      expect(spy).toHaveBeenCalledWith('DELETE', '/foo');

      spy.mockRestore();
    });
  });

  describe('#request(method, url, model)', () => {
    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        const adapter = new JSONAPIAdapter();
        const requestSpy = jest.spyOn(HttpAdapter.prototype, 'request').mockReturnValue(
          Promise.reject({
            code: 404,
            status: 'Not Found'
          })
        );

        return adapter.request('GET', '/foo').catch((response) => {
          expect(requestSpy).toHaveBeenCalledWith('GET', '/foo', null);
          expect(response).toEqual({
            code: 404,
            status: 'Not Found'
          });
          requestSpy.mockRestore();
        });
      });
    });

    describe('on success without response data', () => {
      test('it resolves to the response', () => {
        const adapter = new JSONAPIAdapter();
        const requestSpy = jest.spyOn(HttpAdapter.prototype, 'request').mockReturnValue(
          Promise.resolve({
            code: 200,
            status: 'OK'
          })
        );

        return adapter.request('DELETE', '/foo').then((response) => {
          expect(requestSpy).toHaveBeenCalledWith('DELETE', '/foo', null);
          expect(response).toEqual({
            code: 200,
            status: 'OK'
          });
          requestSpy.mockRestore();
        });
      });
    });

    describe('on success with response data', () => {
      describe('GET request', () => {
        const adapter = new JSONAPIAdapter();

        const requestSpy = jest.spyOn(HttpAdapter.prototype, 'request').mockReturnValue(
          Promise.resolve({
            code: 200,
            status: 'OK',
            data: {
              data: {
                type: 'users',
                id: '123',
                attributes: {
                  'first-name': 'John',
                  'last-name': 'Doe'
                }
              }
            }
          })
        );

        // Mock model
        const Model = {
          deserializerOptions: {
            keyForAttribute: 'camelCase'
          }
        };

        const deserializeSpy = jest.spyOn(adapter, 'deserialize').mockReturnValue(
          Promise.resolve({
            id: '123',
            firstName: 'John',
            lastName: 'Doe'
          })
        );

        return adapter.request('GET', '/foo', Model).then((response) => {
          expect(requestSpy).toHaveBeenCalledWith('GET', '/foo', null);
          expect(deserializeSpy.mock.calls[0]).toEqual([
            {
              data: {
                type: 'users',
                id: '123',
                attributes: {
                  'first-name': 'John',
                  'last-name': 'Doe'
                }
              }
            },
            {
              keyForAttribute: 'camelCase'
            }
          ]);

          expect(response).toEqual({
            code: 200,
            status: 'OK',
            data: {
              id: '123',
              firstName: 'John',
              lastName: 'Doe'
            }
          });

          requestSpy.mockRestore();
        });
      });

      describe('POST request', () => {
        const adapter = new JSONAPIAdapter();
        const requestSpy = jest.spyOn(HttpAdapter.prototype, 'request').mockReturnValue(
          Promise.resolve({
            code: 201,
            status: 'Created',
            data: {
              data: {
                type: 'users',
                id: '123',
                attributes: {
                  'first-name': 'John',
                  'last-name': 'Doe'
                }
              }
            }
          })
        );

        // Mock model
        class User {
          static deserializerOptions = {
            keyForAttribute: 'camelCase'
          };

          serializerOptions() {
            return {
              attributes: ['firstName', 'lastName']
            };
          }
        }
        const user = new User();

        const serializeSpy = jest.spyOn(adapter, 'serialize').mockReturnValue({
          data: {
            type: 'user',
            attributes: {
              'first-name': 'John',
              'last-name': 'Doe'
            }
          }
        });
        const deserializeSpy = jest.spyOn(adapter, 'deserialize').mockReturnValue(
          Promise.resolve({
            id: '123',
            firstName: 'John',
            lastName: 'Doe'
          })
        );

        return adapter.request('POST', '/foo', user).then((response) => {
          expect(requestSpy).toHaveBeenCalledWith('POST', '/foo', {
            data: {
              type: 'user',
              attributes: {
                'first-name': 'John',
                'last-name': 'Doe'
              }
            }
          });
          expect(serializeSpy.mock.calls[0][0]).toEqual(user);
          expect(deserializeSpy.mock.calls[0][0]).toEqual({
            data: {
              type: 'users',
              id: '123',
              attributes: {
                'first-name': 'John',
                'last-name': 'Doe'
              }
            }
          });
          expect(deserializeSpy.mock.calls[0][1]).toEqual({
            keyForAttribute: 'camelCase'
          });
          expect(response).toEqual({
            code: 201,
            status: 'Created',
            data: {
              id: '123',
              firstName: 'John',
              lastName: 'Doe'
            }
          });

          requestSpy.mockRestore();
        });
      });
    });
  });
});
