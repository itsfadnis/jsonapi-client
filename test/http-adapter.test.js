const HttpAdapter = require('../src/http-adapter');

describe('HttpAdapter', () => {
  describe('instantiation', () => {
    test('it sets the right defaults if nothing is passed in', () => {
      const adapter = new HttpAdapter();
      expect(adapter.baseURL).toBe(`${window.location.protocol}//${window.location.host}`);
      expect(adapter.namespace).toBe('');
      expect(adapter.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        HTTP_X_REQUESTED_WITH: 'XMLHttpRequest'
      });
    });

    test('it sets the right values with params passed in', () => {
      const adapter = new HttpAdapter({
        baseURL: 'foo.com',
        namespace: '/v2',
        headers: {
          boo: 'baz'
        }
      });
      expect(adapter.baseURL).toBe('foo.com');
      expect(adapter.namespace).toBe('/v2');
      expect(adapter.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        HTTP_X_REQUESTED_WITH: 'XMLHttpRequest',
        boo: 'baz'
      });
    });
  });

  describe('#get(url, data)', () => {
    test('it calls & returns #require(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      adapter.request = jest.fn().mockReturnValue('something');

      const returnValue = adapter.get('/foo', 'bar');
      expect(returnValue).toBe('something');

      expect(adapter.request.mock.calls.length).toBe(1);
      expect(adapter.request.mock.calls[0][0]).toBe('GET');
      expect(adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(adapter.request.mock.calls[0][2]).toBe('bar');
    });
  });

  describe('#patch(url, data)', () => {
    test('it calls & returns #require(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      adapter.request = jest.fn().mockReturnValue('something');

      const returnValue = adapter.patch('/foo', 'bar');
      expect(returnValue).toBe('something');

      expect(adapter.request.mock.calls.length).toBe(1);
      expect(adapter.request.mock.calls[0][0]).toBe('PATCH');
      expect(adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(adapter.request.mock.calls[0][2]).toBe('bar');
    });
  });

  describe('#post(url, data)', () => {
    test('it calls & returns #require(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      adapter.request = jest.fn().mockReturnValue('something');

      const returnValue = adapter.post('/foo', 'bar');
      expect(returnValue).toBe('something');

      expect(adapter.request.mock.calls.length).toBe(1);
      expect(adapter.request.mock.calls[0][0]).toBe('POST');
      expect(adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(adapter.request.mock.calls[0][2]).toBe('bar');
    });
  });

  describe('#delete(url, data)', () => {
    test('it calls & returns #require(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      adapter.request = jest.fn().mockReturnValue('something');

      const returnValue = adapter.delete('/foo', 'bar');
      expect(returnValue).toBe('something');

      expect(adapter.request.mock.calls.length).toBe(1);
      expect(adapter.request.mock.calls[0][0]).toBe('DELETE');
      expect(adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(adapter.request.mock.calls[0][2]).toBe('bar');
    });
  });
});
