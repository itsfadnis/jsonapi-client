import HttpAdapter from '../src/http-adapter';
import nock = require('nock');

describe('HttpAdapter', () => {
  describe('instantiation', () => {
    test('it sets the right defaults if nothing is passed in', () => {
      const adapter = new HttpAdapter();
      expect(adapter.host).toBe('');
      expect(adapter.namespace).toBe('');
      expect(adapter.headers).toEqual({
        'content-type': 'application/json',
      });
    });

    test('it sets the right values with params passed in', () => {
      const adapter = new HttpAdapter({
        host: 'foo.com',
        namespace: '/v2',
        headers: {
          boo: 'baz',
        },
      });
      expect(adapter.host).toBe('foo.com');
      expect(adapter.namespace).toBe('/v2');
      expect(adapter.headers).toEqual({
        'content-type': 'application/json',
        boo: 'baz',
      });
    });
  });

  describe('#request(method, url, data', () => {
    it('resolves the response on success', () => {
      const scope = nock('https://foo.com', {
        reqheaders: {
          'content-type': 'application/json',
          authorization: 'xxx',
        },
      })
        .defaultReplyHeaders({
          'x-powered-by': 'Rails',
          'content-type': 'application/json',
        })
        .post('/bar', { create: 'foo_bar' })
        .reply(
          200,
          {
            foo: 'bar',
          },
          {
            abc: 'def',
            ghi: 'jkl',
          },
        );

      const adapter = new HttpAdapter({
        host: 'https://foo.com',
        headers: {
          authorization: 'xxx',
        },
      });

      return adapter.request('POST', '/bar', { create: 'foo_bar' }).then((response) => {
        expect(scope.isDone()).toBeTruthy();
        expect(response).toEqual({
          status: 200,
          statusText: 'OK',
          headers: {
            'x-powered-by': 'Rails',
            'content-type': 'application/json',
            abc: 'def',
            ghi: 'jkl',
          },
          data: {
            foo: 'bar',
          },
        });
      });
    });

    it('resolves the response (without data) on success when it is not json', () => {
      const scope = nock('https://foo.com', {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .defaultReplyHeaders({
          'content-type': 'text/plain',
        })
        .get('/bar')
        .reply(200, 'Text (Not JSON) response!');

      const adapter = new HttpAdapter({
        host: 'https://foo.com',
      });

      return adapter.request('GET', '/bar').then((response) => {
        expect(scope.isDone()).toBeTruthy();
        expect(response).toEqual({
          status: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'text/plain',
          },
          data: undefined,
        });
      });
    });

    it('rejects the response on failure', () => {
      const scope = nock('https://foo.com', {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .defaultReplyHeaders({
          'content-type': 'application/json',
        })
        .delete('/bar')
        .reply(404, { success: false });

      const adapter = new HttpAdapter({
        host: 'https://foo.com',
      });

      return adapter.request('DELETE', '/bar').catch((response) => {
        expect(scope.isDone()).toBeTruthy();
        expect(response).toEqual({
          status: 404,
          statusText: 'Not Found',
          headers: {
            'content-type': 'application/json',
          },
          data: {
            success: false,
          },
        });
      });
    });
  });

  describe('http api', () => {
    let adapter;
    let requestSpy;

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: { foo: 'bar' },
      data: { abc: 'def' },
    };

    beforeEach(() => {
      adapter = new HttpAdapter();
      requestSpy = jest.spyOn(adapter, 'request').mockResolvedValue(mockResponse);
    });

    afterEach(() => {
      requestSpy.mockRestore();
      adapter = undefined;
    });

    describe('#get(url)', () => {
      test('it calls & returns #request(method, url, data) with the right params', () => {
        expect(adapter.get('/xyz')).resolves.toEqual(mockResponse);
        expect(requestSpy).toHaveBeenCalledWith('GET', '/xyz');
      });
    });

    describe('#post(url, data)', () => {
      test('it calls & returns #request(method, url, data) with the right params', () => {
        expect(adapter.post('/xyz', 'foo')).resolves.toEqual(mockResponse);
        expect(requestSpy).toHaveBeenCalledWith('POST', '/xyz', 'foo');
      });
    });

    describe('#put(url, data)', () => {
      test('it calls & returns #request(method, url, data) with the right params', () => {
        expect(adapter.put('/xyz', 'foo')).resolves.toEqual(mockResponse);
        expect(requestSpy).toHaveBeenCalledWith('PUT', '/xyz', 'foo');
      });
    });

    describe('#patch(url, data)', () => {
      test('it calls & returns #request(method, url, data) with the right params', () => {
        expect(adapter.patch('/xyz', 'foo')).resolves.toEqual(mockResponse);
        expect(requestSpy).toHaveBeenCalledWith('PATCH', '/xyz', 'foo');
      });
    });

    describe('#delete(url)', () => {
      test('it calls & returns #request(method, url, data) with the right params', () => {
        expect(adapter.delete('/xyz', 'foo')).resolves.toEqual(mockResponse);
        expect(requestSpy).toHaveBeenCalledWith('DELETE', '/xyz', 'foo');
      });
    });
  });
});
