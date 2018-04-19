const HttpAdapter = require('../src/http-adapter');

describe('HttpAdapter', () => {
  describe('instantiation', () => {
    test('it sets the right defaults if nothing is passed in', () => {
      const adapter = new HttpAdapter();
      expect(adapter.host).toBe(`${window.location.protocol}//${window.location.host}`);
      expect(adapter.namespace).toBe('');
      expect(adapter.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        HTTP_X_REQUESTED_WITH: 'XMLHttpRequest'
      });
      expect(adapter.fetch).toEqual(window.fetch);
    });

    test('it sets the right values with params passed in', () => {
      const adapter = new HttpAdapter({
        host: 'foo.com',
        namespace: '/v2',
        headers: {
          boo: 'baz'
        },
        fetch: 'fetchpassedin'
      });
      expect(adapter.host).toBe('foo.com');
      expect(adapter.namespace).toBe('/v2');
      expect(adapter.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        HTTP_X_REQUESTED_WITH: 'XMLHttpRequest',
        boo: 'baz'
      });
      expect(adapter.fetch).toBe('fetchpassedin');
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
    let adapter;
    beforeAll(() => {
      adapter = new HttpAdapter({
        fetch: jest.fn()
      });
    });

    afterEach(() => {
      adapter.fetch.mockClear();
    });

    describe('when response is not ok', () => {
      test('it rejects the response', () => {
        const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
          'content-type': 'application/json'
        });

        const mockResponse = {
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entitiy',
          text: () => Promise.resolve(JSON.stringify({
            errors: [{
              code: 'foo'
            }, {
              code: 'bar'
            }]
          }))
        };

        adapter.fetch.mockReturnValue(Promise.resolve(mockResponse));

        return adapter.request('POST', '/foo', { foo: 'bar' }).catch((response) => {
          expect(adapter.fetch).toHaveBeenCalledWith(adapter.host + adapter.namespace + '/foo', {
            method: 'POST',
            headers: adapter.headers,
            body: JSON.stringify({
              foo: 'bar'
            })
          });
          expect(extractResponseHeadersSpy).toHaveBeenCalledWith(mockResponse);
          expect(response).toEqual({
            status: 422,
            statusText: 'Unprocessable Entitiy',
            headers: {
              'content-type': 'application/json'
            },
            data: {
              errors: [{
                code: 'foo'
              }, {
                code: 'bar'
              }]
            }
          });
          extractResponseHeadersSpy.mockRestore();
        });
      });
    });

    describe('when response is ok', () => {
      describe('without request body (GET/DELETE)', () => {
        test('it resolves to the parsed response', () => {
          const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
            'content-type': 'application/json'
          });

          const mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            text: () => Promise.resolve(JSON.stringify({ foo: 'bar' }))
          };

          adapter.fetch.mockReturnValue(Promise.resolve(mockResponse));

          return adapter.request('GET', '/foo').then((response) => {
            expect(adapter.fetch).toHaveBeenCalledWith(adapter.host + adapter.namespace + '/foo', {
              method: 'GET',
              headers: adapter.headers,
              body: undefined
            });
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
          const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
            'content-type': 'application/json'
          });

          const mockResponse = {
            ok: true,
            status: 201,
            statusText: 'Created',
            text: () => Promise.resolve(JSON.stringify({ foo: 'bar' }))
          };

          adapter.fetch.mockReturnValue(Promise.resolve(mockResponse));

          return adapter.request('POST', '/foo', { boo: 'baz' }).then((response) => {
            expect(adapter.fetch).toHaveBeenCalledWith(adapter.host + adapter.namespace + '/foo', {
              method: 'POST',
              headers: adapter.headers,
              body: JSON.stringify({ boo: 'baz' })
            });
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
          const extractResponseHeadersSpy = jest.spyOn(adapter, 'extractResponseHeaders').mockReturnValue({
            'content-type': 'application/json'
          });

          const mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            text: () => Promise.resolve()
          };

          adapter.fetch.mockReturnValue(Promise.resolve(mockResponse));

          return adapter.request('DELETE', '/foo').then((response) => {
            expect(adapter.fetch).toHaveBeenCalledWith(adapter.host + adapter.namespace + '/foo', {
              method: 'DELETE',
              headers: adapter.headers,
              body: undefined
            });
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

  describe('#patch(url, data)', () => {
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
