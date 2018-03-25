const Model = require('../src/model');
const HttpAdapter = require('../src/http-adapter');
const JSONAPIError = require('../src/jsonapi-error');
const JSONAPISerializer = require('jsonapi-serializer');

describe('Model', () => {
  describe('instantiation', () => {
    describe('with id', () => {
      test('it sets the right values', () => {
        const model = new Model({
          id: 1
        });

        expect(model.id).toBe('1');
        expect(model._persisted).toBe(true);
        expect(model._errors).toBeInstanceOf(JSONAPIError);
      });
    });

    describe('without id', () => {
      test('it sets the right values', () => {
        const model = new Model();

        expect(typeof model.id).toBe('string');
        expect(model._persisted).toBe(false);
        expect(model._errors).toBeInstanceOf(JSONAPIError);
      });
    });
  });

  describe('#attributes', () => {
    test('it returns model attributes', () => {
      const model = new Model({
        id: '123'
      });

      // Set fake values on model
      model.foo = 'foo';
      model.bar = 'bar';
      model._foo = '_foo';

      model.printFoo = () => 'foo';
      model.objectFoo = {
        foo: 'bar'
      };
      model.arrayFoo = ['foo'];

      expect(model.attributes).toEqual({
        id: '123',
        foo: 'foo',
        bar: 'bar'
      });
    });
  });

  describe('#relationships', () => {
    test('it returns model relationships', () => {
      const model = new Model();

      // Set fake values on model
      model.foo = 'foo';
      model.bar = 'bar';

      model.printFoo = () => 'foo';
      model.objectFoo = {
        foo: 'bar'
      };
      model.arrayFoo = ['foo'];

      expect(model.relationships).toEqual({
        objectFoo: {
          foo: 'bar'
        },
        arrayFoo: ['foo']
      });
    });
  });

  describe('#valid', () => {
    describe('when invalid', () => {
      test('it returns false', () => {
        const model = new Model();
        model.errors.clear = jest.fn();
        model.validate = jest.fn();
        model.errors.count = jest.fn().mockReturnValue(100);

        expect(model.valid).toBe(false);

        expect(model.errors.clear).toHaveBeenCalled();
        expect(model.validate).toHaveBeenCalled();
        expect(model.errors.count).toHaveBeenCalled();
      });
    });

    describe('when valid', () => {
      test('it returns true', () => {
        const model = new Model();
        model.errors.clear = jest.fn();
        model.validate = jest.fn();
        model.errors.count = jest.fn().mockReturnValue(0);

        expect(model.valid).toBe(true);

        expect(model.errors.clear).toHaveBeenCalled();
        expect(model.validate).toHaveBeenCalled();
        expect(model.errors.count).toHaveBeenCalled();
      });
    });
  });

  describe('#request(method, url, data)', () => {
    beforeEach(() => {
      Model.adapter = new HttpAdapter();
      Model.adapter.request = jest.fn().mockReturnValue('something');
    });

    afterEach(() => {
      delete Model.adapter;
    });

    test('it calls & returns .adapter.request(method, url, data)', () => {
      const model = new Model();
      const returnValue = model.request('POST', '/foo', { foo: 'bar' });

      expect(model.constructor.adapter.request.mock.calls.length).toBe(1);
      expect(model.constructor.adapter.request.mock.calls[0][0]).toBe('POST');
      expect(model.constructor.adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(model.constructor.adapter.request.mock.calls[0][2]).toEqual({ foo: 'bar' });
      expect(returnValue).toBe('something');
    });
  });

  describe('.fetchAll(args)', () => {
    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an array of instances of the model', () => {
        Model.adapter = new HttpAdapter();

        const mockResponse = {
          code: 200,
          data: [{
            type: 'users',
            id: '123',
            attributes: {
              'first-name': 'John',
              'last-name': 'Doe'
            }
          }, {
            type: 'users',
            id: '456',
            attributes: {
              'first-name': 'Jane',
              'last-name': 'Doe'
            }
          }]
        };

        const constructorBaseUrlSpy = jest.spyOn(Model, '_constructBaseUrl').mockReturnValue('/xyz');
        const getSpy = jest.spyOn(Model.adapter, 'get').mockReturnValue(
          Promise.resolve(mockResponse)
        );

        const mockDeserializedArray = [
          new Model({
            id: '123',
            firstName: 'John',
            lastName: 'Doe'
          }),
          new Model({
            id: '456',
            firstName: 'Jane',
            lastName: 'Doe'
          })
        ];
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockReturnValue(
          Promise.resolve(mockDeserializedArray)
        );

        return Model.fetchAll({
          foo: 'bar'
        }).then((response) => {
          expect(constructorBaseUrlSpy.mock.calls.length).toBe(1);
          expect(constructorBaseUrlSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0][0]).toEqual('/xyz');

          expect(deserializeSpy).toHaveBeenCalledWith(mockResponse.data);
          expect(response).toEqual(mockDeserializedArray);

          deserializeSpy.mockRestore();
          getSpy.mockRestore();
          constructorBaseUrlSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        const mockResponse = {
          code: 500,
          status: 'Internal Server Error'
        };

        const getSpy = jest.spyOn(Model.adapter, 'get').mockReturnValue(Promise.reject(mockResponse));
        const constructorBaseUrlSpy = jest.spyOn(Model, '_constructBaseUrl').mockReturnValue('/xyz');

        return Model.fetchAll({
          foo: 'bar'
        }).catch((response) => {
          expect(constructorBaseUrlSpy.mock.calls.length).toBe(1);
          expect(constructorBaseUrlSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0][0]).toEqual('/xyz');

          expect(response).toEqual(mockResponse);

          getSpy.mockRestore();
          constructorBaseUrlSpy.mockRestore();
        });
      });
    });
  });

  describe('.fetch(id, args)', () => {
    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an instance of the model', () => {
        Model.adapter = new HttpAdapter();

        const constructorBaseUrlSpy = jest.spyOn(Model, '_constructBaseUrl').mockReturnValue('/xyz');
        const getSpy = jest.spyOn(Model.adapter, 'get').mockReturnValue(
          Promise.resolve({
            code: 200,
            data: {
              id: '123'
            }
          })
        );

        const mockDeserializedObject = new Model({ id: '123' });
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockReturnValue(
          Promise.resolve(mockDeserializedObject)
        );

        return Model.fetch('123', { foo: 'bar' }).then((response) => {
          expect(constructorBaseUrlSpy.mock.calls.length).toBe(1);
          expect(constructorBaseUrlSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0]).toEqual(['/xyz/123']);

          expect(deserializeSpy).toHaveBeenCalledWith({ id: '123' });
          expect(response).toEqual(mockDeserializedObject);

          constructorBaseUrlSpy.mockRestore();
          deserializeSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.get = jest.fn().mockReturnValue(
          Promise.reject({
            code: 404,
            status: 'Not Found'
          })
        );

        const constructorBaseUrlSpy = jest.spyOn(Model, '_constructBaseUrl').mockReturnValue('/xyz');

        return Model.fetch('123', { foo: 'bar' }).catch((response) => {
          expect(constructorBaseUrlSpy.mock.calls.length).toBe(1);
          expect(constructorBaseUrlSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(Model.adapter.get.mock.calls.length).toBe(1);
          expect(Model.adapter.get.mock.calls[0][0]).toEqual('/xyz/123');

          expect(response).toEqual({
            code: 404,
            status: 'Not Found'
          });

          constructorBaseUrlSpy.mockRestore();
        });
      });
    });
  });

  describe('.destroy(id, args)', () => {
    let _constructBaseUrl;
    beforeEach(() => {
      _constructBaseUrl = Model._constructBaseUrl;
    });

    afterEach(() => {
      delete Model.adapter;
      Model._constructBaseUrl = _constructBaseUrl;
    });

    describe('on success', () => {
      test('it resolves to the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.delete = jest.fn().mockReturnValue(
          Promise.resolve({
            code: 200,
            status: 'OK'
          })
        );

        Model._constructBaseUrl = jest.fn().mockReturnValue('/xyz');

        return Model.destroy('123', { foo: 'bar' }).then((response) => {
          expect(Model._constructBaseUrl.mock.calls.length).toBe(1);
          expect(Model._constructBaseUrl.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(Model.adapter.delete.mock.calls.length).toBe(1);
          expect(Model.adapter.delete.mock.calls[0][0]).toEqual('/xyz/123');

          expect(response).toEqual({
            code: 200,
            status: 'OK'
          });
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.delete = jest.fn().mockReturnValue(
          Promise.reject({
            code: 404,
            status: 'Not Found'
          })
        );

        Model._constructBaseUrl = jest.fn().mockReturnValue('/xyz');

        return Model.destroy('123', { foo: 'bar' }).catch((response) => {
          expect(Model._constructBaseUrl.mock.calls.length).toBe(1);
          expect(Model._constructBaseUrl.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(Model.adapter.delete.mock.calls.length).toBe(1);
          expect(Model.adapter.delete.mock.calls[0][0]).toEqual('/xyz/123');

          expect(response).toEqual({
            code: 404,
            status: 'Not Found'
          });
        });
      });
    });
  });

  describe('#save()', () => {
    describe('on persisted model', () => {
      test('it calls & returns #_update()', () => {
        const model = new Model();
        model._persisted = true;
        model._update = jest.fn().mockReturnValue('something');

        const returnValue = model.save();

        expect(returnValue).toBe('something');
        expect(model._update).toHaveBeenCalled();
      });
    });

    describe('on new model', () => {
      test('it calls & returns #_create()', () => {
        const model = new Model();
        model._persisted = false;
        model._create = jest.fn().mockReturnValue('something');

        const returnValue = model.save();

        expect(returnValue).toBe('something');
        expect(model._create).toHaveBeenCalled();
      });
    });
  });

  describe('#_create()', () => {
    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an instance of the model', () => {
        Model.adapter = new HttpAdapter();

        const mockResponse = {
          code: 201,
          data: {
            id: '123'
          }
        };
        Model.adapter.post = jest.fn().mockReturnValue(Promise.resolve(mockResponse));

        const model = new Model();

        const mockSerializedObject = {
          data: {
            type: 'base',
            id: 'kewm19j49'
          }
        };
        const serializeSpy = jest.spyOn(model, 'serialize').mockReturnValue(mockSerializedObject);

        const mockDeserializedObject = {
          id: '123'
        };
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockReturnValue(
          Promise.resolve(mockDeserializedObject)
        );

        return model._create().then((response) => {
          expect(Model.adapter.post.mock.calls.length).toBe(1);
          expect(Model.adapter.post.mock.calls[0][0]).toBe(model.baseURL);
          expect(Model.adapter.post.mock.calls[0][1]).toEqual(mockSerializedObject);

          expect(serializeSpy).toHaveBeenCalled();
          expect(deserializeSpy).toHaveBeenCalledWith(mockResponse.data);

          expect(response).toEqual(mockDeserializedObject);

          deserializeSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.post = jest.fn().mockReturnValue(
          Promise.reject({
            code: 500,
            status: 'Internal Server Error'
          })
        );

        const model = new Model();
        const serializeSpy = jest.spyOn(model, 'serialize').mockReturnValue({
          foo: 'bar'
        });

        return model._create().catch((response) => {
          expect(Model.adapter.post.mock.calls.length).toBe(1);
          expect(Model.adapter.post.mock.calls[0][0]).toBe(model.baseURL);
          expect(Model.adapter.post.mock.calls[0][1]).toEqual({ foo: 'bar' });

          expect(serializeSpy).toHaveBeenCalled();
          expect(response).toEqual({
            code: 500,
            status: 'Internal Server Error'
          });
        });
      });
    });
  });

  describe('#_update()', () => {
    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an instance of the model', () => {
        Model.adapter = new HttpAdapter();

        const mockResponse = {
          code: 200,
          data: {
            id: '123'
          }
        };

        Model.adapter.patch = jest.fn().mockReturnValue(Promise.resolve(mockResponse));
        const model = new Model({
          id: '123'
        });

        const mockSerializedObject = {
          data: {
            type: 'base',
            id: '123'
          }
        };
        const serializeSpy = jest.spyOn(model, 'serialize').mockReturnValue(mockSerializedObject);

        const mockDeserializedObject = {
          id: '123'
        };
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockReturnValue(
          Promise.resolve(mockDeserializedObject)
        );

        return model._update().then((response) => {
          expect(Model.adapter.patch.mock.calls.length).toBe(1);
          expect(Model.adapter.patch.mock.calls[0][0]).toBe(`${model.baseURL}/123`);
          expect(Model.adapter.patch.mock.calls[0][1]).toEqual(mockSerializedObject);

          expect(serializeSpy).toHaveBeenCalled();
          expect(deserializeSpy).toHaveBeenCalledWith(mockResponse.data);
          expect(response).toEqual(mockDeserializedObject);

          deserializeSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.patch = jest.fn().mockReturnValue(
          Promise.reject({
            code: 422,
            status: 'Unprocessable Entity',
            data: {
              errors: [{
                code: 'invalid'
              }]
            }
          })
        );

        const model = new Model({
          id: '123'
        });

        const mockSerializedObject = {
          data: {
            type: 'base',
            id: '123'
          }
        };
        const serializeSpy = jest.spyOn(model, 'serialize').mockReturnValue(mockSerializedObject);

        return model._update().catch((response) => {
          expect(Model.adapter.patch.mock.calls.length).toBe(1);
          expect(Model.adapter.patch.mock.calls[0][0]).toBe(`${model.baseURL}/123`);
          expect(Model.adapter.patch.mock.calls[0][1]).toEqual(mockSerializedObject);

          expect(serializeSpy).toHaveBeenCalled();
          expect(model._errors).toEqual(new JSONAPIError(response.data));
          expect(response).toEqual({
            code: 422,
            status: 'Unprocessable Entity',
            data: {
              errors: [{
                code: 'invalid'
              }]
            }
          });
        });
      });
    });
  });

  describe('#destroy()', () => {
    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.delete = jest.fn().mockReturnValue(
          Promise.resolve({
            code: 200,
            status: 'OK'
          })
        );

        const model = new Model({
          id: '123'
        });

        return model.destroy().then((response) => {
          expect(Model.adapter.delete.mock.calls.length).toBe(1);
          expect(Model.adapter.delete.mock.calls[0][0]).toBe(`${model.baseURL}/123`);

          expect(response).toEqual({
            code: 200,
            status: 'OK'
          });
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.delete = jest.fn().mockReturnValue(
          Promise.reject({
            code: 404,
            status: 'Not Found'
          })
        );

        const model = new Model({
          id: '123'
        });

        return model.destroy().catch((response) => {
          expect(Model.adapter.delete.mock.calls.length).toBe(1);
          expect(Model.adapter.delete.mock.calls[0][0]).toBe(`${model.baseURL}/123`);

          expect(response).toEqual({
            code: 404,
            status: 'Not Found'
          });
        });
      });
    });
  });

  describe('._urlParams()', () => {
    afterEach(() => {
      Model.baseURL = '';
    });

    describe('when url params exist', () => {
      test('it returns an array of them', () => {
        Model.baseURL = '/posts/:post_id/comments/:comment_id/likes';

        expect(Model._urlParams()).toEqual([
          ':post_id',
          ':comment_id'
        ]);
      });
    });

    describe('when url params don\'t exist', () => {
      test('it returns null', () => {
        Model.baseURL = '/posts';

        expect(Model._urlParams()).toBeNull();
      });
    });
  });

  describe('#baseURL', () => {
    test('it returns ._constructBaseUrl()', () => {
      const model = new Model();

      const spy = jest.spyOn(Model, '_constructBaseUrl').mockReturnValue('/xyz');

      expect(model.baseURL).toBe('/xyz');
      expect(spy).toHaveBeenCalled();

      spy.mockReset();
      spy.mockRestore();
    });
  });

  describe('._constructBaseUrl(args)', () => {
    afterEach(() => {
      Model.baseURL = '';
    });

    describe('with no args', () => {
      test('it returns the right url ', () => {
        Model.baseURL = '/foo/bar';
        expect(Model._constructBaseUrl()).toBe('/foo/bar');
      });
    });

    describe('with args', () => {
      test('it returns the right url', () => {
        Model.baseURL = '/posts/:post_id/comments/:comment_id/likes';
        expect(Model._constructBaseUrl({
          post_id: 101,
          comment_id: 234
        })).toBe('/posts/101/comments/234/likes');
      });
    });
  });

  describe('#serializerOptions()', () => {
    test('it returns the right options', () => {
      const model = new Model();

      const attributesSpy = jest.spyOn(model, 'attributes', 'get').mockReturnValue({
        firstName: 'John',
        lastName: 'Doe'
      });

      const relationshipsSpy = jest.spyOn(model, 'relationships', 'get').mockReturnValue({
        address: {
          type: 'work',
          street: 'Dogwood Way',
          zip: '12345',
          get attributes() {
            return ['type', 'street', 'zip'];
          }
        }
      });

      expect(model.serializerOptions()).toEqual({
        attributes: ['firstName', 'lastName', 'address'],
        address: {
          ref: 'id',
          attributes: ['type', 'street', 'zip']
        }
      });
      expect(attributesSpy).toHaveBeenCalled();
      expect(relationshipsSpy).toHaveBeenCalled();
    });
  });

  describe('.deserializerOptions', () => {
    test('it returns the right defaults', () => {
      expect(Model.deserializerOptions).toEqual({
        keyForAttribute: 'camelCase'
      });
    });
  });

  describe('#serialize()', () => {
    test('it serializes the model', () => {
      const model = new Model();
      const optionsSpy = jest.spyOn(model, 'serializerOptions').mockReturnValue({
        attributes: ['firstName', 'lastName']
      });
      expect(model.serialize()).toEqual({
        data: {
          type: 'users',
          id: '123',
          attributes: {
            'first-name': 'John',
            'last-name': 'Doe'
          }
        }
      });
      expect(optionsSpy).toHaveBeenCalled();
      expect(JSONAPISerializer.Serializer.mock.instances.length).toBe(1);
      expect(JSONAPISerializer.Serializer).toHaveBeenCalledWith('base', {
        attributes: ['firstName', 'lastName']
      });
      expect(JSONAPISerializer.Serializer.prototype.serialize).toHaveBeenCalledWith(model);
      optionsSpy.mockRestore();
    });
  });

  describe('.deserialize(response)', () => {
    test('it deserializes the response', () => {
      class User extends Model {
        constructor(args) {
          super(args);
          this.firstName = args.firstName;
          this.lastName = args.lastName;
        }
      }

      return User.deserialize({
        data: {
          type: 'users',
          id: '123',
          attributes: {
            'first-name': 'John',
            'last-name': 'Doe'
          }
        }
      }).then((object) => {
        expect(object).toEqual(new User({
          id: '123',
          firstName: 'John',
          lastName: 'Doe'
        }));
        expect(JSONAPISerializer.Deserializer.mock.instances.length).toBe(1);
        expect(JSONAPISerializer.Deserializer).toHaveBeenCalledWith(User.deserializerOptions);
      });
    });
  });
});
