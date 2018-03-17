const Errors = require('../src/model-errors');

describe('ModelErrors', () => {
  describe('instantiation', () => {
    test('it sets the right defaults if nothing is passed in', () => {
      const errors = new Errors();
      expect(errors._errors).toEqual({});
      expect(errors._jsonErrors).toEqual([]);
    });

    test('its sets the right values with params passed in', () => {
      // Mock response payload coming in from the adapter
      const response = {
        code: 422,
        status: 'Unprocessable Entity',
        headers: {
          foo: 'bar'
        },
        data: {
          errors: [
            {
              code: 'invalid',
              source: {
                pointer: '/data/attributes/first-name'
              }
            }
          ]
        }
      };

      const errors = new Errors(response);
      expect(errors._errors).toEqual({});
      expect(errors._jsonErrors).toEqual(response.data.errors);
    });
  });

  describe('#generate()', () => {
    test('it parses jsonapi errors correctly', () => {
      // Mock response payload coming in from the adapter
      const response = {
        code: 422,
        data: {
          errors: [
            {
              code: '123',
              source: { pointer: '/data/attributes/first-name' },
              detail: 'First name must contain at least three characters.'
            },
            {
              code: '225',
              source: { pointer: '/data/attributes/password' },
              detail: 'The password provided is missing a punctuation character.'
            },
            {
              code: '226',
              source: { pointer: '/data/attributes/password' }
            },
            {
              code: '124',
              source: { pointer: '/data' }
            }
          ]
        }
      };

      const errors = new Errors(response);
      errors.generate();

      expect(errors.all).toEqual({
        firstName: [{
          code: '123',
          detail: 'First name must contain at least three characters.'
        }],
        password: [{
          code: '225',
          detail: 'The password provided is missing a punctuation character.'
        }, {
          code: '226',
          detail: undefined
        }],
        base: [{
          code: '124',
          detail: undefined
        }]
      });
    });
  });

  describe('#count', () => {
    test('it returns the right error count', () => {
      const errors = new Errors();
      expect(errors.count).toBe(0);

      errors.add('a', '123');
      errors.add('b', '456');

      expect(errors.count).toBe(2);
    });
  });

  describe('#clear()', () => {
    test('it resets the errors', () => {
      const errors = new Errors();

      errors.add('a', '123');
      errors.add('b', '456');

      errors.clear();
      expect(errors.count).toBe(0);
      expect(errors.all).toEqual({});
    });
  });
});
