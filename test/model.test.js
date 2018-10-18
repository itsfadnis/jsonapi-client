const Model = require('../src/model');
const HttpAdapter = require('../src/http-adapter');
const JSONAPIError = require('../src/jsonapi-error');
const Serializer = require('jsonapi-serializer/lib/serializer');
const Deserializer = require('jsonapi-serializer/lib/deserializer');

describe('Model', () => {
  describe('instantiation', () => {
    describe('with args passed in', () => {
      test('it sets the right values', () => {
        const model = new Model({
          id: 1,
          links: {
            self: '/foo/1'
          }
        });

        expect(model.id).toBe('1');
        expect(model.persisted).toBe(true);
        expect(model.errors).toEqual(new JSONAPIError());
        expect(model.links).toEqual({
          self: '/foo/1'
        });
      });
    });

    describe('without args passed in', () => {
      test('it sets the right defaults', () => {
        const model = new Model();

        expect(typeof model.id).toBe('string');
        expect(model.persisted).toBe(false);
        expect(model.errors).toEqual(new JSONAPIError());
        expect(model.links).toEqual({});
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
          status: 200,
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

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
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
          expect(constructBaseURLSpy.mock.calls.length).toBe(1);
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0][0]).toEqual('/xyz');

          expect(deserializeSpy).toHaveBeenCalledWith(mockResponse.data);
          expect(response).toEqual(mockDeserializedArray);

          deserializeSpy.mockRestore();
          getSpy.mockRestore();
          constructBaseURLSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        const mockResponse = {
          status: 500,
          statusText: 'Internal Server Error'
        };

        const getSpy = jest.spyOn(Model.adapter, 'get').mockReturnValue(Promise.reject(mockResponse));
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return Model.fetchAll({
          foo: 'bar'
        }).catch((response) => {
          expect(constructBaseURLSpy.mock.calls.length).toBe(1);
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0][0]).toEqual('/xyz');

          expect(response).toEqual(mockResponse);

          getSpy.mockRestore();
          constructBaseURLSpy.mockRestore();
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

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
        const getSpy = jest.spyOn(Model.adapter, 'get').mockReturnValue(
          Promise.resolve({
            status: 200,
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
          expect(constructBaseURLSpy.mock.calls.length).toBe(1);
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0]).toEqual(['/xyz/123']);

          expect(deserializeSpy).toHaveBeenCalledWith({ id: '123' });
          expect(response).toEqual(mockDeserializedObject);

          constructBaseURLSpy.mockRestore();
          deserializeSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.get = jest.fn().mockReturnValue(
          Promise.reject({
            status: 404,
            statusText: 'Not Found'
          })
        );

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return Model.fetch('123', { foo: 'bar' }).catch((response) => {
          expect(constructBaseURLSpy.mock.calls.length).toBe(1);
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(Model.adapter.get.mock.calls.length).toBe(1);
          expect(Model.adapter.get.mock.calls[0][0]).toEqual('/xyz/123');

          expect(response).toEqual({
            status: 404,
            statusText: 'Not Found'
          });

          constructBaseURLSpy.mockRestore();
        });
      });
    });
  });

  describe('.toQueryString(object)', () => {
    test('it returns a query string', () => {
      expect(Model.toQueryString({
        foo: 'bar',
        boo: 'baz'
      })).toBe('foo=bar&boo=baz');
    });
  });

  describe('.query(query, args)', () => {
    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an array of instances of the model', () => {
        Model.adapter = new HttpAdapter();

        const mockResponse = {
          status: 200,
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

        const toQueryStringSpy = jest.spyOn(Model, 'toQueryString').mockReturnValue('foo=bar');
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
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

        return Model.query({ foo: 'bar' }, { boo: 'baz' }).then((response) => {
          expect(toQueryStringSpy.mock.calls.length).toBe(1);
          expect(toQueryStringSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(constructBaseURLSpy.mock.calls.length).toBe(1);
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ boo: 'baz' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0][0]).toEqual('/xyz?foo=bar');

          expect(deserializeSpy).toHaveBeenCalledWith(mockResponse.data);
          expect(response).toEqual(mockDeserializedArray);

          deserializeSpy.mockRestore();
          getSpy.mockRestore();
          constructBaseURLSpy.mockRestore();
          toQueryStringSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        const mockResponse = {
          status: 500,
          statusText: 'Internal Server Error'
        };

        const getSpy = jest.spyOn(Model.adapter, 'get').mockReturnValue(Promise.reject(mockResponse));
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
        const toQueryStringSpy = jest.spyOn(Model, 'toQueryString').mockReturnValue('foo=bar');

        return Model.query({ foo: 'bar' }, { boo: 'baz' }).catch((response) => {
          expect(toQueryStringSpy.mock.calls.length).toBe(1);
          expect(toQueryStringSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });

          expect(constructBaseURLSpy.mock.calls.length).toBe(1);
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ boo: 'baz' });

          expect(getSpy.mock.calls.length).toBe(1);
          expect(getSpy.mock.calls[0][0]).toEqual('/xyz?foo=bar');

          expect(response).toEqual(mockResponse);

          getSpy.mockRestore();
          constructBaseURLSpy.mockRestore();
          toQueryStringSpy.mockRestore();
        });
      });
    });
  });

  describe('.destroy(id, args)', () => {
    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.delete = jest.fn().mockReturnValue(
          Promise.resolve({
            status: 200,
            statusText: 'OK'
          })
        );

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return Model.destroy('123', { foo: 'bar' }).then((response) => {
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });
          expect(Model.adapter.delete.mock.calls[0][0]).toEqual('/xyz/123');
          expect(response).toEqual({
            status: 200,
            statusText: 'OK'
          });
          constructBaseURLSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.delete = jest.fn().mockReturnValue(
          Promise.reject({
            status: 404,
            statusText: 'Not Found'
          })
        );

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return Model.destroy('123', { foo: 'bar' }).catch((response) => {
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });
          expect(Model.adapter.delete.mock.calls[0][0]).toEqual('/xyz/123');
          expect(response).toEqual({
            status: 404,
            statusText: 'Not Found'
          });
          constructBaseURLSpy.mockRestore();
        });
      });
    });
  });

  describe('#save()', () => {
    describe('on invalid model', () => {
      const model = new Model();
      jest.spyOn(model, 'valid', 'get').mockReturnValue(false);
      expect(model.save()).rejects.toEqual(new Error('Unprocessable Entity'));
    });

    describe('on persisted model', () => {
      test('it calls & returns #_update()', () => {
        const model = new Model();
        model.persisted = true;
        model._update = jest.fn().mockReturnValue('something');

        const returnValue = model.save();

        expect(returnValue).toBe('something');
        expect(model._update).toHaveBeenCalled();
      });
    });

    describe('on new model', () => {
      test('it calls & returns #_create()', () => {
        const model = new Model();
        model.persisted = false;
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
          status: 201,
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
          expect(Model.adapter.post.mock.calls[0][0]).toBe(model.constructBaseURL());
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
            status: 500,
            statusText: 'Internal Server Error'
          })
        );

        const model = new Model();
        const serializeSpy = jest.spyOn(model, 'serialize').mockReturnValue({
          foo: 'bar'
        });

        return model._create().catch((response) => {
          expect(Model.adapter.post.mock.calls.length).toBe(1);
          expect(Model.adapter.post.mock.calls[0][0]).toBe(model.constructBaseURL());
          expect(Model.adapter.post.mock.calls[0][1]).toEqual({ foo: 'bar' });

          expect(serializeSpy).toHaveBeenCalled();
          expect(response).toEqual({
            status: 500,
            statusText: 'Internal Server Error'
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
          status: 200,
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
          expect(Model.adapter.patch.mock.calls[0][0]).toBe(`${ model.constructBaseURL() }/123`);
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
            status: 422,
            statusText: 'Unprocessable Entity',
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
          expect(Model.adapter.patch.mock.calls[0][0]).toBe(`${ model.constructBaseURL() }/123`);
          expect(Model.adapter.patch.mock.calls[0][1]).toEqual(mockSerializedObject);
          expect(serializeSpy).toHaveBeenCalled();
          expect(model.errors).toEqual(new JSONAPIError(response.data));
          expect(response).toEqual({
            status: 422,
            statusText: 'Unprocessable Entity',
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
            status: 200,
            statusText: 'OK'
          })
        );

        const model = new Model({
          id: '123'
        });

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return model.destroy().then((response) => {
          expect(Model.adapter.delete.mock.calls[0][0]).toBe('/xyz/123');
          expect(constructBaseURLSpy).toHaveBeenCalled();
          expect(response).toEqual({
            status: 200,
            statusText: 'OK'
          });
          constructBaseURLSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        Model.adapter = new HttpAdapter();

        Model.adapter.delete = jest.fn().mockReturnValue(
          Promise.reject({
            status: 404,
            statusText: 'Not Found'
          })
        );

        const model = new Model({
          id: '123'
        });

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return model.destroy().catch((response) => {
          expect(Model.adapter.delete.mock.calls[0][0]).toBe('/xyz/123');
          expect(constructBaseURLSpy).toHaveBeenCalled();
          expect(response).toEqual({
            status: 404,
            statusText: 'Not Found'
          });
          constructBaseURLSpy.mockRestore();
        });
      });
    });
  });

  describe('.urlParams()', () => {
    afterEach(() => {
      Model.baseURL = '';
    });

    describe('when url params exist', () => {
      test('it returns an array of them', () => {
        Model.baseURL = '/posts/:post_id/comments/:comment_id/likes';

        expect(Model.urlParams()).toEqual([
          ':post_id',
          ':comment_id'
        ]);

        Model.baseURL = '/posts/:postId/comments/:commentId/likes';
        expect(Model.urlParams()).toEqual([
          ':postId',
          ':commentId'
        ]);
      });
    });

    describe('when url params don\'t exist', () => {
      test('it returns null', () => {
        Model.baseURL = '/posts';

        expect(Model.urlParams()).toBeNull();
      });
    });
  });

  describe('.constructBaseURL(args)', () => {
    test('it returns the right url', () => {
      Model.baseURL = '/posts/:post_id/comments/:comment_id/likes';
      expect(Model.constructBaseURL({
        post_id: 101,
        comment_id: 234
      })).toBe('/posts/101/comments/234/likes');
      Model.baseURL = '';
    });
  });

  describe('#constructBaseURL()', () => {
    describe('without url params', () => {
      test('it returns the baseURL', () => {
        const spy = jest.spyOn(Model, 'urlParams').mockReturnValue(null);
        Model.baseURL = '/foo';
        const model = new Model();
        expect(model.constructBaseURL()).toBe('/foo');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
        Model.baseURL = '';
      });
    });

    describe('with url params', () => {
      test('it throws an error', () => {
        const urlParams = [':post_id', ':comment_id'];
        const spy = jest.spyOn(Model, 'urlParams').mockReturnValue(urlParams);
        const model = new Model();
        expect(model.constructBaseURL.bind(model)).toThrow(
          'Missing url params: :post_id, :comment_id.\n' +
          'Override the #constructBaseURL() method of ' + model.constructor.name + '.'
        );
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
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
      expect(Serializer.mock.instances.length).toBe(1);
      expect(Serializer).toHaveBeenCalledWith('base', {
        attributes: ['firstName', 'lastName']
      });
      expect(Serializer.prototype.serialize).toHaveBeenCalledWith(model);
      optionsSpy.mockRestore();
    });
  });

  describe('.deserialize(response)', () => {
    class User extends Model {
      constructor(args) {
        super(args);
        this.firstName = args.firstName;
        this.lastName = args.lastName;
      }
    }

    test('it deserializes the response', () => {
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
        expect(Deserializer.mock.instances.length).toBe(1);
        expect(Deserializer).toHaveBeenCalledWith(User.deserializerOptions);
      });
    });

    test('it extracts links & meta for a collection', () => {
      const deserializedArray = [{
        id: '123',
        firstName: 'John',
        lastName: 'Doe'
      }, {
        id: '456',
        firstName: 'Jane',
        lastName: 'Doe'
      }];
      deserializedArray.links = {
        all: '/users'
      };
      deserializedArray.meta = {
        count: 2
      };
      const deserializeSpy = jest
        .spyOn(Deserializer.prototype, 'deserialize')
        .mockResolvedValue(deserializedArray);
      return User.deserialize('foo').then((array) => {
        expect(array[0]).toEqual(new User({ id: '123', firstName: 'John', lastName: 'Doe' }));
        expect(array[1]).toEqual(new User({ id: '456', firstName: 'Jane', lastName: 'Doe' }));
        expect(array.links).toEqual({ all: '/users' });
        expect(array.meta).toEqual({ count: 2 });
        deserializeSpy.mockRestore();
      });
    });
  });

  describe('.keysForAttributes()', () => {
    test('it returns an array of attribute keys', () => {
      class Address extends Model {
        constructor(args = {}) {
          super(args);
          this.type = args.type;
          this.street = args.street;
          this.zip = args.zip;
        }
      }

      class DriversLicense extends Model {
        constructor(args = {}) {
          super(args);
          this.licenseNumber = args.licenseNumber;
        }
      }

      class Person extends Model {
        constructor(args = {}) {
          super(args);
          this.firstName = args.firstName;
          this.lastName = args.lastName;
          this.addresses = this.hasMany(Address, args.addresses);
          this.driversLicense = this.hasOne(DriversLicense, args.driversLicense);
        }
      }

      expect(Address.keysForAttributes()).toEqual(['type', 'street', 'zip']);
      expect(DriversLicense.keysForAttributes()).toEqual(['licenseNumber']);
      expect(Person.keysForAttributes()).toEqual(['firstName', 'lastName']);
    });
  });

  describe('.keysForRelationships()', () => {
    test('it returns an array of relationship keys', () => {
      class Address extends Model {
        constructor(args = {}) {
          super(args);
          this.type = args.type;
          this.street = args.street;
          this.zip = args.zip;
        }
      }

      class DriversLicense extends Model {
        constructor(args = {}) {
          super(args);
          this.licenseNumber = args.licenseNumber;
        }
      }

      class Person extends Model {
        constructor(args = {}) {
          super(args);
          this.firstName = args.firstName;
          this.lastName = args.lastName;
          this.addresses = this.hasMany(Address, args.addresses);
          this.driversLicense = this.belongsTo(DriversLicense, args.driversLicense);
        }
      }

      expect(Address.keysForRelationships()).toEqual([]);
      expect(DriversLicense.keysForRelationships()).toEqual([]);
      expect(Person.keysForRelationships()).toEqual(['addresses', 'driversLicense']);
    });
  });

  describe('#serializerOptions()', () => {
    test('it returns the right defaults', () => {
      class Address extends Model {
        constructor(args = {}) {
          super(args);
          this.type = args.type;
          this.street = args.street;
          this.zip = args.zip;
        }
      }

      class DriversLicense extends Model {
        constructor(args = {}) {
          super(args);
          this.licenseNumber = args.licenseNumber;
        }
      }

      class Person extends Model {
        constructor(args = {}) {
          super(args);
          this.firstName = args.firstName || '';
          this.lastName = args.lastName;
          this.addresses = this.hasMany(Address, args.addresses);
          this.driversLicense = this.hasOne(DriversLicense, args.driversLicense);
        }
      }

      const person = new Person();
      expect(person.serializerOptions()).toEqual({
        attributes: ['firstName', 'lastName', 'addresses', 'driversLicense'],
        addresses: {
          ref: 'id',
          attributes: ['type', 'street', 'zip']
        },
        driversLicense: {
          ref: 'id',
          attributes: ['licenseNumber']
        }
      });
    });
  });

  describe('#attributes()', () => {
    test('it returns model attributes', () => {
      class Address extends Model {
        constructor(args = {}) {
          super(args);
          this.type = args.type;
          this.street = args.street;
          this.zip = args.zip;
        }
      }

      class DriversLicense extends Model {
        constructor(args = {}) {
          super(args);
          this.licenseNumber = args.licenseNumber;
        }
      }

      class Person extends Model {
        constructor(args = {}) {
          super(args);
          this.firstName = args.firstName;
          this.lastName = args.lastName;
          this.addresses = this.hasMany(Address, args.addresses);
          this.driversLicense = this.hasOne(DriversLicense, args.driversLicense);
        }
      }

      const person = new Person({
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(person.attributes()).toEqual({
        firstName: 'John',
        lastName: 'Doe'
      });
    });
  });
});
