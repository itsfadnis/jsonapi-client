class HttpAdapter {
  constructor(args = {}) {
    this.host = args.host || args.baseURL || `${window.location.protocol}//${window.location.host}`;
    this.namespace = args.namespace || '';
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      HTTP_X_REQUESTED_WITH: 'XMLHttpRequest',
      ...args.headers
    };
    this.fetch = args.fetch || window.fetch;
  }

  get(url) {
    return this.request('GET', url);
  }

  post(url, data) {
    return this.request('POST', url, data);
  }

  put(url, data) {
    return this.request('PUT', url, data);
  }

  patch(url, data) {
    return this.request('PATCH', url, data);
  }

  delete(url) {
    return this.request('DELETE', url);
  }

  extractResponseHeaders(response) {
    let object = {};
    for (const [key, value] of response.headers.entries()) {
      object[key] = value;
    }
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

module.exports = HttpAdapter;
