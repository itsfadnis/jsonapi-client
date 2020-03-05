class HttpAdapter {
  constructor(args = {}) {
    this.host = args.host || args.baseURL || '';
    this.namespace = args.namespace || '';
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...args.headers
    };
    this.fetch = args.fetch || window.fetch;
  }

  extractResponseHeaders(response) {
    let object = {};
    response.headers.forEach((value, key) => {
      object[key] = value;
    });
    return object;
  }

  extractResponseBody(response) {
    return response.text().then((text) => {
      try {
        return JSON.parse(text);
      } catch (err) {
        return undefined;
      }
    });
  }

  request(method, url, data) {
    return this.fetch(this.host + this.namespace + url, {
      method,
      headers: this.headers,
      body: data && JSON.stringify(data)
    }).then((response) => {
      let payload = {
        status: response.status,
        statusText: response.statusText,
        headers: this.extractResponseHeaders(response)
      };
      return this.extractResponseBody(response).then((json) => {
        if (json) {
          payload.data = json;
        }
        if (response.ok) {
          return payload;
        }
        throw payload;
      });
    });
  }
}

['get', 'delete', 'post', 'put', 'patch'].forEach((method) => {
  HttpAdapter.prototype[method] = function fn() {
    const args = Array.prototype.slice.call(arguments);
    args.unshift(method.toUpperCase());
    return this.request.apply(this, args);
  };
});

module.exports = HttpAdapter;
