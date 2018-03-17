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

  describe('#put(url, data)', () => {
    test('it calls & returns #require(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      adapter.request = jest.fn().mockReturnValue('something');

      const returnValue = adapter.put('/foo', 'bar');
      expect(returnValue).toBe('something');

      expect(adapter.request.mock.calls.length).toBe(1);
      expect(adapter.request.mock.calls[0][0]).toBe('PUT');
      expect(adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(adapter.request.mock.calls[0][2]).toBe('bar');
    });
  });

  describe('#delete(url, data)', () => {
    test('it calls & returns #require(method, url, data) with the right params', () => {
      const adapter = new HttpAdapter();
      adapter.request = jest.fn().mockReturnValue('something');

      const returnValue = adapter.delete('/foo');
      expect(returnValue).toBe('something');

      expect(adapter.request.mock.calls.length).toBe(1);
      expect(adapter.request.mock.calls[0][0]).toBe('DELETE');
      expect(adapter.request.mock.calls[0][1]).toBe('/foo');
      expect(adapter.request.mock.calls[0][2]).toBeUndefined();
    });
  });

  describe('#_parseResponse(response)', () => {
    describe('when response body is json', () => {
      test('it parses the response correctly', () => {
        expect.assertions(1);

        const adapter = new HttpAdapter();

        // Mock fetch Response
        const response = {
          status: 200,
          statusText: 'OK',
          headers: {
            entries() {
              return [
                ['foo', 'bar'],
                ['boo', 'baz']
              ];
            }
          },
          text() {
            return Promise.resolve(
              JSON.stringify({
                foo: 'bar'
              })
            );
          }
        };

        return expect(adapter._parseResponse(response)).resolves.toEqual({
          code: 200,
          status: 'OK',
          headers: {
            foo: 'bar',
            boo: 'baz'
          },
          data: {
            foo: 'bar'
          }
        });
      });
    });

    describe('when response body is not json', () => {
      test('it parses the response correctly', () => {
        expect.assertions(1);

        const adapter = new HttpAdapter();

        // Mock fetch Response
        const response = {
          status: 204,
          statusText: 'No Content',
          headers: {
            entries() {
              return [
                ['foo', 'bar'],
                ['boo', 'baz']
              ];
            }
          },
          text() {
            return Promise.resolve();
          }
        };

        return expect(adapter._parseResponse(response)).resolves.toEqual({
          code: 204,
          status: 'No Content',
          headers: {
            foo: 'bar',
            boo: 'baz'
          },
          data: null
        });
      });
    });
  });

  describe('#request(method, url, data)', () => {
    describe('when response is not ok', () => {
      test('it works as expected', () => {
        const adapter = new HttpAdapter();

        // Mock fetch Response
        const fetchResponse = {
          ok: false
        };

        window.fetch = jest.fn().mockReturnValue(Promise.resolve(fetchResponse));

        // Mock parsed response
        const parsedResponse = {
          foo: 'bar'
        };

        adapter._parseResponse = jest.fn().mockReturnValue(Promise.resolve(parsedResponse));

        // Mock fetch Request
        window.Request = jest.fn();

        return adapter.request('GET', '/foo').catch((json) => {
          expect(Request.mock.calls.length).toBe(1);
          expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
          expect(Request.mock.calls[0][1]).toEqual({
            method: 'GET',
            headers: adapter.headers,
            body: null
          });

          expect(fetch.mock.calls.length).toBe(1);
          expect(fetch.mock.calls[0][0]).toBe(Request.mock.instances[0]);

          expect(adapter._parseResponse.mock.calls.length).toBe(1);
          expect(adapter._parseResponse.mock.calls[0][0]).toEqual(fetchResponse);

          expect(json).toEqual(parsedResponse);
        });
      });
    });

    describe('when response is ok', () => {
      describe('GET request', () => {
        test('it works as expected', () => {
          const adapter = new HttpAdapter();

          // Mock fetch Response
          const fetchResponse = {
            ok: true
          };

          window.fetch = jest.fn().mockReturnValue(Promise.resolve(fetchResponse));

          // Mock parsed response
          const parsedResponse = {
            foo: 'bar'
          };

          adapter._parseResponse = jest.fn().mockReturnValue(Promise.resolve(parsedResponse));

          // Mock fetch Request
          window.Request = jest.fn();

          return adapter.request('GET', '/foo').then((json) => {
            expect(Request.mock.calls.length).toBe(1);
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'GET',
              headers: adapter.headers,
              body: null
            });

            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toBe(Request.mock.instances[0]);

            expect(adapter._parseResponse.mock.calls.length).toBe(1);
            expect(adapter._parseResponse.mock.calls[0][0]).toEqual(fetchResponse);

            expect(json).toEqual(parsedResponse);
          });
        });
      });

      describe('DELETE request', () => {
        test('it works as expected', () => {
          const adapter = new HttpAdapter();

          // Mock fetch Response
          const fetchResponse = {
            ok: true
          };

          window.fetch = jest.fn().mockReturnValue(Promise.resolve(fetchResponse));

          adapter._parseResponse = jest.fn().mockReturnValue(Promise.resolve());

          // Mock fetch Request
          window.Request = jest.fn();

          return adapter.request('DELETE', '/foo').then((json) => {
            expect(Request.mock.calls.length).toBe(1);
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'DELETE',
              headers: adapter.headers,
              body: null
            });

            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toBe(Request.mock.instances[0]);

            expect(adapter._parseResponse.mock.calls.length).toBe(1);
            expect(adapter._parseResponse.mock.calls[0][0]).toEqual(fetchResponse);

            expect(json).toBeUndefined();
          });
        });
      });

      describe('POST request', () => {
        test('it works as expected', () => {
          const adapter = new HttpAdapter();

          // Mock fetch Response
          const fetchResponse = {
            ok: true
          };

          window.fetch = jest.fn().mockReturnValue(Promise.resolve(fetchResponse));

          // Mock parsed response
          const parsedResponse = {
            foo: 'bar'
          };

          adapter._parseResponse = jest.fn().mockReturnValue(Promise.resolve(parsedResponse));

          // Mock fetch Request
          window.Request = jest.fn();

          return adapter.request('POST', '/foo', { boo: 'baz' }).then((json) => {
            expect(Request.mock.calls.length).toBe(1);
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'POST',
              headers: adapter.headers,
              body: JSON.stringify({ boo: 'baz' })
            });

            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toBe(Request.mock.instances[0]);

            expect(adapter._parseResponse.mock.calls.length).toBe(1);
            expect(adapter._parseResponse.mock.calls[0][0]).toEqual(fetchResponse);

            expect(json).toEqual(parsedResponse);
          });
        });
      });

      describe('PUT request', () => {
        test('it works as expected', () => {
          const adapter = new HttpAdapter();

          // Mock fetch Response
          const fetchResponse = {
            ok: true
          };

          window.fetch = jest.fn().mockReturnValue(Promise.resolve(fetchResponse));

          // Mock parsed response
          const parsedResponse = {
            foo: 'bar'
          };

          adapter._parseResponse = jest.fn().mockReturnValue(Promise.resolve(parsedResponse));

          // Mock fetch Request
          window.Request = jest.fn();

          return adapter.request('PUT', '/foo', { boo: 'baz' }).then((json) => {
            expect(Request.mock.calls.length).toBe(1);
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'PUT',
              headers: adapter.headers,
              body: JSON.stringify({ boo: 'baz' })
            });

            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toBe(Request.mock.instances[0]);

            expect(adapter._parseResponse.mock.calls.length).toBe(1);
            expect(adapter._parseResponse.mock.calls[0][0]).toEqual(fetchResponse);

            expect(json).toEqual(parsedResponse);
          });
        });
      });

      describe('PATCH request', () => {
        test('it works as expected', () => {
          const adapter = new HttpAdapter();

          // Mock fetch Response
          const fetchResponse = {
            ok: true
          };

          window.fetch = jest.fn().mockReturnValue(Promise.resolve(fetchResponse));

          // Mock parsed response
          const parsedResponse = {
            foo: 'bar'
          };

          adapter._parseResponse = jest.fn().mockReturnValue(Promise.resolve(parsedResponse));

          // Mock fetch Request
          window.Request = jest.fn();

          return adapter.request('PATCH', '/foo', { boo: 'baz' }).then((json) => {
            expect(Request.mock.calls.length).toBe(1);
            expect(Request.mock.calls[0][0]).toBe(adapter.baseURL + adapter.namespace + '/foo');
            expect(Request.mock.calls[0][1]).toEqual({
              method: 'PATCH',
              headers: adapter.headers,
              body: JSON.stringify({ boo: 'baz' })
            });

            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toBe(Request.mock.instances[0]);

            expect(adapter._parseResponse.mock.calls.length).toBe(1);
            expect(adapter._parseResponse.mock.calls[0][0]).toEqual(fetchResponse);

            expect(json).toEqual(parsedResponse);
          });
        });
      });
    });
  });
});
