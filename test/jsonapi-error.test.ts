import JSONAPIError from '../src/jsonapi-error';

describe('JSONAPIError', () => {
  describe('instantiation', () => {
    test('it sets empty errors with no values passed in', () => {
      const jsonapiError = new JSONAPIError();
      expect(jsonapiError.errors).toEqual([]);
    });

    test('it sets the right values with params passed in', () => {
      const jsonapiError = new JSONAPIError({
        errors: [
          {
            id: '123',
            status: '422',
            code: '456',
            title: 'Some title',
            detail: 'Some detail',
            meta: { foo: 'bar' },
          },
          {
            source: {
              pointer: '/data/attributes/first-name',
              parameter: 'first-name',
            },
            links: { about: '/path/to/error' },
          },
        ],
      });

      expect(jsonapiError.errors.length).toBe(2);
      const [first, second] = jsonapiError.errors;

      expect(first.id).toBe('123');
      expect(first.status).toBe('422');
      expect(first.code).toBe('456');
      expect(first.title).toBe('Some title');
      expect(first.detail).toBe('Some detail');
      expect(first.meta).toEqual({
        foo: 'bar',
      });

      expect(second.source).toEqual({
        pointer: '/data/attributes/first-name',
        parameter: 'first-name',
      });
      expect(second.links).toEqual({
        about: '/path/to/error',
      });
    });
  });

  describe('#clear()', () => {
    test('it resets all errors', () => {
      const jsonapiError = new JSONAPIError({
        errors: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
      expect(jsonapiError.errors.length).toBe(3);

      jsonapiError.clear();
      expect(jsonapiError.errors).toEqual([]);
    });
  });

  describe('#count()', () => {
    test('it returns the error count', () => {
      const jsonapiError = new JSONAPIError({
        errors: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      expect(jsonapiError.count()).toBe(3);
    });
  });

  describe('#extract()', () => {
    test('it returns errors by source', () => {
      // Source can either be base, an attribute, or a URI parameter
      // A convenient way to expose errors against a model object
      const jsonapiError = new JSONAPIError({
        errors: [
          {
            code: '422',
            source: { pointer: '/data/attributes/answers', parameter: 14 },
            title: 'Length exceeds',
            detail: 'Could be maximum 10 character long',
          },
          {
            code: '422',
            source: { pointer: '/data/attributes/answers', parameter: 15 },
            title: 'Length exceeds',
            detail: 'could be maximum 10character long',
          },
          {
            code: '123',
            source: { pointer: '/data/attributes/first-name' },
            title: 'Value is too short',
            detail: 'First name must contain at least three characters.',
          },
          {
            code: '225',
            source: { pointer: '/data/attributes/password' },
            title: 'Passwords must contain a letter, number, and punctuation character.',
            detail: 'The password provided is missing a punctuation character.',
          },
          {
            code: '226',
            source: { pointer: '/data/attributes/password' },
            title: 'Password and password confirmation do not match.',
          },
          {
            code: '227',
            source: { pointer: '/data' },
            title: 'Invalid object',
          },
        ],
      });

      expect(jsonapiError.extract()).toEqual({
        14: [
          {
            code: '422',
            source: { pointer: '/data/attributes/answers', parameter: 14 },
            title: 'Length exceeds',
            detail: 'Could be maximum 10 character long',
          },
        ],
        15: [
          {
            code: '422',
            source: { pointer: '/data/attributes/answers', parameter: 15 },
            title: 'Length exceeds',
            detail: 'could be maximum 10character long',
          },
        ],
        password: [
          {
            code: '225',
            source: { pointer: '/data/attributes/password' },
            title: 'Passwords must contain a letter, number, and punctuation character.',
            detail: 'The password provided is missing a punctuation character.',
          },
          {
            code: '226',
            source: { pointer: '/data/attributes/password' },
            title: 'Password and password confirmation do not match.',
          },
        ],
        'first-name': [
          {
            code: '123',
            source: { pointer: '/data/attributes/first-name' },
            title: 'Value is too short',
            detail: 'First name must contain at least three characters.',
          },
        ],
        base: [
          {
            code: '227',
            source: { pointer: '/data' },
            title: 'Invalid object',
          },
        ],
      });
    });
  });

  describe('#add(error)', () => {
    test('it adds an error', () => {
      const jsonapiError = new JSONAPIError();
      jsonapiError.add({
        code: 'invalid',
        source: {
          pointer: '/data',
        },
      });
      expect(jsonapiError.errors).toEqual([
        {
          code: 'invalid',
          source: {
            pointer: '/data',
          },
        },
      ]);
    });
  });
});
