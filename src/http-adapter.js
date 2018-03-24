class HttpAdapter {
  constructor(args = {}) {
    this.baseURL = args.baseURL || `${ window.location.protocol }//${ window.location.host }`;
    this.namespace = args.namespace || '';
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      HTTP_X_REQUESTED_WITH: 'XMLHttpRequest',
      ...args.headers
    };
  }

  request(method, url, data) {
    const request = new Request(this.baseURL + this.namespace + url, {
      method,
      headers: this.headers,
      // Set body if method is POST, PUT, PATCH, not applicable for GET, DELETE
      body: ['POST', 'PUT', 'PATCH'].indexOf(method) > -1 ? JSON.stringify(data) : null
    });

    return fetch(request).then((response) => {
      return this._parseResponse(response).then((json) => {
        if (response.ok) {
          return json;
        }
        throw json;
      });
    });
  }

  _parseResponse(response) {
    let responseHeaders = {};

    for (let [ key, value ] of response.headers.entries()) {
      responseHeaders[key] = value;
    }

    let responsePayload = {
      code: response.status,
      status: response.statusText,
      headers: responseHeaders
    };

    return response.text().then((text) => {
      let parseFail = false;
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        parseFail = true;
      } finally {
        responsePayload.data = parseFail ? null : json;
        return responsePayload;
      }
    });
  }
}

module.exports = HttpAdapter;
