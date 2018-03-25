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

  describe('#extractResponseHeaders(response)', () => {
    const adapter = new HttpAdapter();
    const mockResponse = {
      status: 200,
      headers: {
        entries: () => [['content-type', 'application/json'], ['charset', 'utf8']]
      }
    };
    expect(adapter.extractResponseHeaders(mockResponse)).toEqual({
      'content-type': 'application/json',
      charset: 'utf8'
    });
  });

  describe('#request(method, url, data)', () => {
    beforeAll(() => {
      window.fetch = jest.fn();
      window.Request = jest.fn();
    });

    afterEach(() => {
      window.fetch.mockClear();
      window.Request.mockClear();
    });

    describe('when response is not ok', () => {
      test('it rejects the response', () => {
        const adapter = new HttpAdapter();

        const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
          'content-type': 'application/json'
        });

        const mockResponse = {
          ok: false,
          status: 404,
          statusText: 'Not Found'
        };

        fetch.mockReturnValue(Promise.resolve(mockResponse));

        return adapter.request('GET', '/foo').catch((response) => {
          expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
          expect(Request.mock.calls[0][1]).toEqual({
            method: 'GET',
            headers: adapter.headers,
            body: undefined
          });
          expect(fetch.mock.calls[0][0]).toEqual(Request.mock.instances[0]);
          expect(extractResponseHeadersSpy).toHaveBeenCalledWith(mockResponse);
          expect(response).toEqual({
            status: 404,
            statusText: 'Not Found',
            headers: {
              'content-type': 'application/json'
            }
          });
          extractResponseHeadersSpy.mockRestore();
        });
      });
    });

    describe('when response is ok', () => {
      describe('without request body (GET/DELETE)', () => {
        test('it resolves to the parsed response', () => {
          const adapter = new HttpAdapter();

          const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
            'content-type': 'application/json'
          });

          const mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ foo: 'bar' })
          };

          fetch.mockReturnValue(Promise.resolve(mockResponse));

          return adapter.request('GET', '/foo').then((response) => {
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'GET',
              headers: adapter.headers,
              body: undefined
            });
            expect(fetch.mock.calls[0][0]).toEqual(Request.mock.instances[0]);
            expect(extractResponseHeadersSpy).toHaveBeenCalledWith(mockResponse);
            expect(response).toEqual({
              status: 200,
              statusText: 'OK',
              headers: {
                'content-type': 'application/json'
              },
              data: {
                foo: 'bar'
              }
            });
            extractResponseHeadersSpy.mockRestore();
          });
        });
      });

      describe('with request body (POST/PATCH/PUT)', () => {
        test('it resolves to the parsed response', () => {
          const adapter = new HttpAdapter();

          const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
            'content-type': 'application/json'
          });

          const mockResponse = {
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({ foo: 'bar' })
          };

          fetch.mockReturnValue(Promise.resolve(mockResponse));

          return adapter.request('POST', '/foo', { boo: 'baz' }).then((response) => {
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'POST',
              headers: adapter.headers,
              body: JSON.stringify({ boo: 'baz' })
            });
            expect(fetch.mock.calls[0][0]).toEqual(Request.mock.instances[0]);
            expect(extractResponseHeadersSpy).toHaveBeenCalledWith(mockResponse);
            expect(response).toEqual({
              status: 201,
              statusText: 'Created',
              headers: {
                'content-type': 'application/json'
              },
              data: {
                foo: 'bar'
              }
            });
            extractResponseHeadersSpy.mockRestore();
          });
        });
      });

      describe('when response body is not json', () => {
        test('it resolves to the parsed response', () => {
          const adapter = new HttpAdapter();

          const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
            'content-type': 'application/json'
          });

          const mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.reject()
          };

          fetch.mockReturnValue(Promise.resolve(mockResponse));

          return adapter.request('DELETE', '/foo').then((response) => {
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'DELETE',
              headers: adapter.headers,
              body: undefined
            });
            expect(fetch.mock.calls[0][0]).toEqual(Request.mock.instances[0]);
            expect(extractResponseHeadersSpy).toHaveBeenCalledWith(mockResponse);
            expect(response).toEqual({
              status: 200,
              statusText: 'OK',
              headers: {
                'content-type': 'application/json'
              }
            });
            extractResponseHeadersSpy.mockRestore();
          });
        });
      });
    });
  });

  describe('#get(url)', () => {
    test('it calls & returns #request(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      const requestSpy = jest.spyOn(adapter, 'request').mockReturnValue('something');
      expect(adapter.get('/xyz')).toBe('something');
      expect(requestSpy).toHaveBeenCalledWith('GET', '/xyz');
    });
  });

  describe('#post(url, data)', () => {
    test('it calls & returns #request(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      const requestSpy = jest.spyOn(adapter, 'request').mockReturnValue('something');
      expect(adapter.post('/xyz', 'foo')).toBe('something');
      expect(requestSpy).toHaveBeenCalledWith('POST', '/xyz', 'foo');
    });
  });

  describe('#put(url, data)', () => {
    test('it calls & returns #request(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      const requestSpy = jest.spyOn(adapter, 'request').mockReturnValue('something');
      expect(adapter.put('/xyz', 'foo')).toBe('something');
      expect(requestSpy).toHaveBeenCalledWith('PUT', '/xyz', 'foo');
    });
  });

  describe('#patch(url)', () => {
    test('it calls & returns #request(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      const requestSpy = jest.spyOn(adapter, 'request').mockReturnValue('something');
      expect(adapter.patch('/xyz', 'foo')).toBe('something');
      expect(requestSpy).toHaveBeenCalledWith('PATCH', '/xyz', 'foo');
    });
  });

  describe('#delete(url)', () => {
    test('it calls & returns #request(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      const requestSpy = jest.spyOn(adapter, 'request').mockReturnValue('something');
      expect(adapter.delete('/xyz')).toBe('something');
      expect(requestSpy).toHaveBeenCalledWith('DELETE', '/xyz');
    });
  });
});
