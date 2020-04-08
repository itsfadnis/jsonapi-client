/* eslint
    @typescript-eslint/no-explicit-any: 0,
    @typescript-eslint/no-namespace: 0,
    @typescript-eslint/camelcase: 0
*/

import Model from '../src/model';
import JSONAPIError from '../src/jsonapi-error';
import Serializer from 'jsonapi-serializer/lib/serializer';
import Deserializer from 'jsonapi-serializer/lib/deserializer';

namespace Util {
  export class Address extends Model {
    [k: string]: any;
    constructor(args: any = {}) {
      super(args);
      this.type = args.type;
      this.street = args.street;
      this.zip = args.zip;
    }
  }

  export class DriversLicense extends Model {
    [k: string]: any;
    constructor(args: any = {}) {
      super(args);
      this.licenseNumber = args.licenseNumber;
    }
  }

  export class Person extends Model {
    [k: string]: any;
    constructor(args: any = {}) {
      super(args);
      this.firstName = args.firstName;
      this.lastName = args.lastName;
      this.addresses = this.hasMany(Address, args.addresses);
      this.driversLicense = this.hasOne(DriversLicense, args.driversLicense);
    }
  }
}

describe('Model', () => {
  describe('instantiation', () => {
    describe('with args passed in', () => {
      test('it sets the right values', () => {
        const model = new Model({
          id: 1,
          links: {
            self: '/foo/1',
          },
          meta: {
            totalRecords: 50,
          },
        });

        expect(model.id).toBe('1');
        expect(model.persisted).toBe(true);
        expect(model.errors).toEqual(new JSONAPIError());
        expect(model.links).toEqual({
          self: '/foo/1',
        });
        expect(model.meta).toEqual({
          totalRecords: 50,
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

  describe('.fetchAll(args)', () => {
    beforeEach(() => {
      Model.configureAdapter();
    });

    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an array of instances of the model', () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: { 'x-powered-by': 'Rails' },
          data: [
            {
              type: 'users',
              id: '123',
              attributes: {
                'first-name': 'John',
                'last-name': 'Doe',
              },
            },
            {
              type: 'users',
              id: '456',
              attributes: {
                'first-name': 'Jane',
                'last-name': 'Doe',
              },
            },
          ],
        };

        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
        const getSpy = jest.spyOn(Model.adapter, 'get').mockResolvedValue(mockResponse);

        const mockDeserializedArray = [
          new Model({
            id: '123',
            firstName: 'John',
            lastName: 'Doe',
          }),
          new Model({
            id: '456',
            firstName: 'Jane',
            lastName: 'Doe',
          }),
        ];
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockResolvedValue(mockDeserializedArray);

        return Model.fetchAll({
          foo: 'bar',
        }).then((response) => {
          expect(constructBaseURLSpy).toHaveBeenCalledWith({ foo: 'bar' });
          expect(getSpy).toHaveBeenCalledWith('/xyz');

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
        const mockResponse = {
          status: 500,
          headers: { 'x-powered-by': 'Rails' },
          statusText: 'Internal Server Error',
        };

        const getSpy = jest.spyOn(Model.adapter, 'get').mockRejectedValue(mockResponse);
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return Model.fetchAll({
          foo: 'bar',
        }).catch((response) => {
          expect(constructBaseURLSpy).toHaveBeenCalledWith({ foo: 'bar' });
          expect(getSpy).toHaveBeenCalledWith('/xyz');
          expect(response).toEqual(mockResponse);
          getSpy.mockRestore();
          constructBaseURLSpy.mockRestore();
        });
      });
    });
  });

  describe('.fetch(id, args, query)', () => {
    beforeEach(() => {
      Model.configureAdapter();
    });

    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an instance of the model', () => {
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
        const getSpy = jest.spyOn(Model.adapter, 'get').mockResolvedValue({
          status: 200,
          statusText: 'OK',
          headers: { 'x-powered-by': 'Rails' },
          data: {
            id: '123',
          },
        });

        const mockDeserializedObject = new Model({ id: '123' });
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockResolvedValue(mockDeserializedObject);

        return Model.fetch('123', { foo: 'bar' }, { abc: 'def' }).then((response) => {
          expect(constructBaseURLSpy).toHaveBeenCalledWith({ foo: 'bar' });
          expect(getSpy).toHaveBeenCalledWith('/xyz/123?abc=def');
          expect(deserializeSpy).toHaveBeenCalledWith({ id: '123' });
          expect(response).toEqual(mockDeserializedObject);
          getSpy.mockRestore();
          constructBaseURLSpy.mockRestore();
          deserializeSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
        const mockResponse = {
          status: 404,
          statusText: 'Not Found',
          headers: { 'x-powered-by': 'Rails' },
        };
        const getSpy = jest.spyOn(Model.adapter, 'get').mockRejectedValue(mockResponse);

        return Model.fetch('123', { foo: 'bar' }).catch((response) => {
          expect(constructBaseURLSpy).toHaveBeenCalledWith({ foo: 'bar' });
          expect(getSpy).toHaveBeenCalledWith('/xyz/123');
          expect(response).toEqual(mockResponse);
          constructBaseURLSpy.mockRestore();
          getSpy.mockRestore();
        });
      });
    });
  });

  describe('.toQueryString(object)', () => {
    test('it returns a query string', () => {
      expect(
        Model.toQueryString({
          foo: 'bar',
          boo: 'baz',
        }),
      ).toBe('foo=bar&boo=baz');
    });

    test('it returns a query string', () => {
      expect(
        Model.toQueryString({
          foo: 'bar',
          bar: [1, 2],
        }),
      ).toBe('foo=bar&bar%5B%5D=1&bar%5B%5D=2');
    });
  });

  describe('.query(query, args)', () => {
    beforeEach(() => {
      Model.configureAdapter();
    });

    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an array of instances of the model', () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: { 'x-powered-by': 'Rails' },
          data: [
            {
              type: 'users',
              id: '123',
              attributes: {
                'first-name': 'John',
                'last-name': 'Doe',
              },
            },
            {
              type: 'users',
              id: '456',
              attributes: {
                'first-name': 'Jane',
                'last-name': 'Doe',
              },
            },
          ],
        };

        const toQueryStringSpy = jest.spyOn(Model, 'toQueryString').mockReturnValue('foo=bar');
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
        const getSpy = jest.spyOn(Model.adapter, 'get').mockResolvedValue(mockResponse);

        const mockDeserializedArray = [
          new Model({
            id: '123',
            firstName: 'John',
            lastName: 'Doe',
          }),
          new Model({
            id: '456',
            firstName: 'Jane',
            lastName: 'Doe',
          }),
        ];
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockResolvedValue(mockDeserializedArray);

        return Model.query({ foo: 'bar' }, { boo: 'baz' }).then((response) => {
          expect(toQueryStringSpy).toHaveBeenCalledWith({ foo: 'bar' });
          expect(constructBaseURLSpy).toHaveBeenCalledWith({ boo: 'baz' });
          expect(getSpy).toHaveBeenCalledWith('/xyz?foo=bar');
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
        const mockResponse = {
          status: 500,
          headers: {},
          statusText: 'Internal Server Error',
        };

        const getSpy = jest.spyOn(Model.adapter, 'get').mockRejectedValue(mockResponse);
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');
        const toQueryStringSpy = jest.spyOn(Model, 'toQueryString').mockReturnValue('foo=bar');

        return Model.query({ foo: 'bar' }, { boo: 'baz' }).catch((response) => {
          expect(toQueryStringSpy).toHaveBeenCalledWith({ foo: 'bar' });
          expect(constructBaseURLSpy).toHaveBeenCalledWith({ boo: 'baz' });
          expect(getSpy).toHaveBeenCalledWith('/xyz?foo=bar');
          expect(response).toEqual(mockResponse);
          getSpy.mockRestore();
          constructBaseURLSpy.mockRestore();
          toQueryStringSpy.mockRestore();
        });
      });
    });
  });

  describe('.destroy(id, args)', () => {
    beforeEach(() => {
      Model.configureAdapter();
    });

    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to the recieved response', () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: { 'x-powered-by': 'Rails' },
        };
        const deleteSpy = jest.spyOn(Model.adapter, 'delete').mockResolvedValue(mockResponse);
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return Model.destroy('123', { foo: 'bar' }).then((response) => {
          expect(constructBaseURLSpy).toHaveBeenCalledWith({ foo: 'bar' });
          expect(deleteSpy).toHaveBeenCalledWith('/xyz/123');
          expect(response).toEqual(mockResponse);
          constructBaseURLSpy.mockRestore();
          deleteSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        const mockResponse = {
          status: 404,
          statusText: 'Not Found',
          headers: { 'x-powered-by': 'Rails' },
        };
        const deleteSpy = jest.spyOn(Model.adapter, 'delete').mockRejectedValue(mockResponse);
        const constructBaseURLSpy = jest.spyOn(Model, 'constructBaseURL').mockReturnValue('/xyz');

        return Model.destroy('123', { foo: 'bar' }).catch((response) => {
          expect(constructBaseURLSpy.mock.calls[0][0]).toEqual({ foo: 'bar' });
          expect(deleteSpy.mock.calls[0][0]).toEqual('/xyz/123');
          expect(response).toEqual(mockResponse);
          constructBaseURLSpy.mockRestore();
          deleteSpy.mockRestore();
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
    beforeEach(() => {
      Model.configureAdapter();
    });

    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an instance of the model', () => {
        const mockResponse = {
          status: 201,
          statusText: 'Created',
          headers: { 'x-powered-by': 'Rails' },
          data: {
            id: '123',
          },
        };
        const postSpy = jest.spyOn(Model.adapter, 'post').mockResolvedValue(mockResponse);
        const mockSerializedObject = {
          data: {
            type: 'base',
            id: 'kewm19j49',
          },
        };
        const serializeSpy = jest.spyOn(Model.prototype, 'serialize').mockReturnValue(mockSerializedObject);
        const mockDeserializedObject = new Model({ id: '123' });
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockResolvedValue(mockDeserializedObject);

        const model = new Model();
        return model._create().then((response) => {
          expect(postSpy).toHaveBeenCalledWith(model.constructBaseURL(), mockSerializedObject);
          expect(serializeSpy).toHaveBeenCalled();
          expect(deserializeSpy).toHaveBeenCalledWith(mockResponse.data);
          expect(response).toEqual(mockDeserializedObject);
          postSpy.mockRestore();
          serializeSpy.mockRestore();
          deserializeSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        const mockResponse = {
          statusText: 'Internal Server Error',
          status: 500,
          headers: { 'x-powered-by': 'Rails ' },
        };
        const postSpy = jest.spyOn(Model.adapter, 'post').mockRejectedValue(mockResponse);
        const serializeSpy = jest.spyOn(Model.prototype, 'serialize').mockReturnValue({
          foo: 'bar',
        });
        const model = new Model();

        return model._create().catch((response) => {
          expect(postSpy).toHaveBeenCalledWith(model.constructBaseURL(), { foo: 'bar' });
          expect(serializeSpy).toHaveBeenCalled();
          expect(response).toEqual(mockResponse);
          serializeSpy.mockRestore();
          postSpy.mockRestore();
        });
      });
    });
  });

  describe('#_update()', () => {
    beforeEach(() => {
      Model.configureAdapter();
    });

    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to an instance of the model', () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: { 'x-powered-by': 'Rails' },
          data: {
            id: '123',
          },
        };

        const patchSpy = jest.spyOn(Model.adapter, 'patch').mockResolvedValue(mockResponse);
        const mockSerializedObject = {
          data: {
            type: 'base',
            id: '123',
          },
        };
        const serializeSpy = jest.spyOn(Model.prototype, 'serialize').mockReturnValue(mockSerializedObject);
        const mockDeserializedObject = new Model({
          id: '123',
        });
        const deserializeSpy = jest.spyOn(Model, 'deserialize').mockResolvedValue(mockDeserializedObject);
        const model = new Model({
          id: '123',
        });

        return model._update().then((response) => {
          expect(patchSpy).toHaveBeenCalledWith(`${model.constructBaseURL()}/123`, mockSerializedObject);
          expect(serializeSpy).toHaveBeenCalled();
          expect(deserializeSpy).toHaveBeenCalledWith(mockResponse.data);
          expect(response).toEqual(mockDeserializedObject);
          deserializeSpy.mockRestore();
          serializeSpy.mockRestore();
          patchSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        const mockResponse = {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'x-powered-by': 'Rails' },
          data: {
            errors: [
              {
                code: 'invalid',
              },
            ],
          },
        };
        const patchSpy = jest.spyOn(Model.adapter, 'patch').mockRejectedValue(mockResponse);
        const mockSerializedObject = {
          data: {
            type: 'base',
            id: '123',
          },
        };
        const serializeSpy = jest.spyOn(Model.prototype, 'serialize').mockReturnValue(mockSerializedObject);
        const model = new Model({
          id: '123',
        });

        return model._update().catch((response) => {
          expect(patchSpy).toHaveBeenCalledWith(`${model.constructBaseURL()}/123`, mockSerializedObject);
          expect(serializeSpy).toHaveBeenCalled();
          expect(model.errors).toEqual(new JSONAPIError(response.data));
          expect(response).toEqual(mockResponse);
          serializeSpy.mockRestore();
          patchSpy.mockRestore();
        });
      });
    });
  });

  describe('#destroy()', () => {
    beforeEach(() => {
      Model.configureAdapter();
    });

    afterEach(() => {
      delete Model.adapter;
    });

    describe('on success', () => {
      test('it resolves to the recieved response', () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: { 'x-powered-by': 'Rails' },
        };

        const deleteSpy = jest.spyOn(Model.adapter, 'delete').mockResolvedValue(mockResponse);
        const constructBaseURLSpy = jest.spyOn(Model.prototype, 'constructBaseURL').mockReturnValue('/xyz');
        const model = new Model({
          id: '123',
        });

        return model.destroy().then((response) => {
          expect(deleteSpy).toHaveBeenCalledWith('/xyz/123');
          expect(constructBaseURLSpy).toHaveBeenCalled();
          expect(response).toEqual(mockResponse);
          constructBaseURLSpy.mockRestore();
          deleteSpy.mockRestore();
        });
      });
    });

    describe('on failure', () => {
      test('it rejects the recieved response', () => {
        const mockResponse = {
          status: 404,
          statusText: 'Not Found',
          headers: { 'x-powered-by': 'Rails' },
        };

        const deleteSpy = jest.spyOn(Model.adapter, 'delete').mockRejectedValue(mockResponse);
        const constructBaseURLSpy = jest.spyOn(Model.prototype, 'constructBaseURL').mockReturnValue('/xyz');
        const model = new Model({
          id: '123',
        });

        return model.destroy().catch((response) => {
          expect(deleteSpy).toHaveBeenCalledWith('/xyz/123');
          expect(constructBaseURLSpy).toHaveBeenCalled();
          expect(response).toEqual(mockResponse);
          constructBaseURLSpy.mockRestore();
          deleteSpy.mockRestore();
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

        expect(Model.urlParams()).toEqual([':post_id', ':comment_id']);

        Model.baseURL = '/posts/:postId/comments/:commentId/likes';
        expect(Model.urlParams()).toEqual([':postId', ':commentId']);
      });
    });

    describe("when url params don't exist", () => {
      test('it returns null', () => {
        Model.baseURL = '/posts';

        expect(Model.urlParams()).toBeNull();
      });
    });
  });

  describe('.constructBaseURL(args)', () => {
    test('it returns the right url', () => {
      Model.baseURL = '/posts/:post_id/comments/:comment_id/likes';
      expect(
        Model.constructBaseURL({
          post_id: 101,
          comment_id: 234,
        }),
      ).toBe('/posts/101/comments/234/likes');
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
            'Override the #constructBaseURL() method of ' +
            model.constructor.name +
            '.',
        );
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
    });
  });

  describe('.deserializerOptions', () => {
    test('it returns the right defaults', () => {
      expect(Model.deserializerOptions).toEqual({
        keyForAttribute: 'camelCase',
      });
    });
  });

  describe('#serialize()', () => {
    test('it serializes the model when jsonapi type is explicitly specified', () => {
      Model._type = 'foo';
      const model = new Model();
      const optionsSpy = jest.spyOn(model, 'serializerOptions').mockReturnValue({
        attributes: ['firstName', 'lastName'],
      });
      expect(model.serialize()).toEqual({
        data: {
          type: 'users',
          id: '123',
          attributes: {
            'first-name': 'John',
            'last-name': 'Doe',
          },
        },
      });
      expect(optionsSpy).toHaveBeenCalled();
      expect(Serializer.mock.instances.length).toBe(1);
      expect(Serializer).toHaveBeenCalledWith('foo', {
        attributes: ['firstName', 'lastName'],
      });
      expect(Serializer.prototype.serialize).toHaveBeenCalledWith(model);
      optionsSpy.mockRestore();
      delete Model._type;
    });

    test('it throws an expection when the jsonapi type is not specified', () => {
      const model = new Model();
      try {
        model.serialize();
      } catch (err) {
        expect(err.message).toBe(
          'Resource object missing jsonapi type.\nSet static property _type to the model class.',
        );
      }
    });
  });

  describe('.deserialize(response)', () => {
    class User extends Model {
      [k: string]: any;
      constructor(args: any = {}) {
        super(args);
        this.firstName = args.firstName;
        this.lastName = args.lastName;
      }
    }

    test('it deserializes the response', () => {
      return (
        User.deserialize({
          data: {
            type: 'users',
            id: '123',
            attributes: {
              'first-name': 'John',
              'last-name': 'Doe',
            },
          },
        })
          // eslint-disable-next-line
          // @ts-ignore
          .then((object) => {
            expect(object).toEqual(
              new User({
                id: '123',
                firstName: 'John',
                lastName: 'Doe',
              }),
            );
            expect(Deserializer.mock.instances.length).toBe(1);
            expect(Deserializer).toHaveBeenCalledWith(User.deserializerOptions);
          })
      );
    });

    test('it extracts links & meta for a collection', () => {
      const deserializedArray: any = [
        {
          id: '123',
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          id: '456',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      ];
      deserializedArray.links = {
        all: '/users',
      };
      deserializedArray.meta = {
        count: 2,
      };
      const deserializeSpy = jest.spyOn(Deserializer.prototype, 'deserialize').mockResolvedValue(deserializedArray);
      // eslint-disable-next-line
      // @ts-ignore
      return User.deserialize({}).then((array) => {
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
      const { Address, DriversLicense, Person } = Util;
      expect(Address.keysForAttributes()).toEqual(['type', 'street', 'zip']);
      expect(DriversLicense.keysForAttributes()).toEqual(['licenseNumber']);
      expect(Person.keysForAttributes()).toEqual(['firstName', 'lastName']);
    });
  });

  describe('.keysForRelationships()', () => {
    test('it returns an array of relationship keys', () => {
      const { Address, DriversLicense, Person } = Util;
      expect(Address.keysForRelationships()).toEqual([]);
      expect(DriversLicense.keysForRelationships()).toEqual([]);
      expect(Person.keysForRelationships()).toEqual(['addresses', 'driversLicense']);
    });
  });

  describe('#serializerOptions()', () => {
    test('it returns the right defaults', () => {
      const { Person } = Util;
      const person = new Person();
      expect(person.serializerOptions()).toEqual({
        attributes: ['firstName', 'lastName', 'addresses', 'driversLicense'],
        addresses: {
          ref: 'id',
          attributes: ['type', 'street', 'zip'],
        },
        driversLicense: {
          ref: 'id',
          attributes: ['licenseNumber'],
        },
      });
    });
  });

  describe('#attributes()', () => {
    test('it returns model attributes', () => {
      const { Person } = Util;
      const person = new Person({
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(person.attributes()).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });

  describe('.new(args)', () => {
    it('instantiates a new model', () => {
      const { Person } = Util;
      const person = Person.new({
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(person).toBeInstanceOf(Person);
      expect(person.attributes()).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });
});
