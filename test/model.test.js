const Model = require('../src/model');
const JSONAPIAdapter = require('../src/jsonapi-adapter');

describe('Model', () => {
  describe('#request(method, url, data)', () => {
    test('it calls & returns .adapter.request(method, url, data)', () => {
      Model.adapter = new JSONAPIAdapter();
      Model.adapter.request = jest.fn().mockReturnValue('something');

      const model = new Model();
      const returnValue = model.request('POST', '/foo', { foo: 'bar' });

      expect(model.constructor.adapter.request.mock.calls.length).toBe(1);
      expect(model.constructor.adapter.request.mock.calls[0][0]).toBe('POST');
      expect(model.constructor.adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(model.constructor.adapter.request.mock.calls[0][2]).toEqual({ foo: 'bar' });
      expect(returnValue).toBe('something');
    });
  });
});
