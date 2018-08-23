/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export default (function create(defaults) {
  defaults = defaults || {};

  function createMethod(method, allowBody) {
    return (url, config, alt) => {
      let data;
      if (allowBody && arguments.length > 2) {
        data = config;
        config = alt;
      }
      config = Object.assign({method}, config);
      return axios(url, data, config);
    };
  }

  axios.request = axios;
  axios.get = createMethod('get', false);
  axios.delete = createMethod('delete', false);
  axios.options = createMethod('options', false);
  axios.post = createMethod('post', true);
  axios.put = createMethod('put', true);
  axios.patch = createMethod('patch', true);

  function deepMerge(opts, overrides, lowerCase) {
    if (Array.isArray(opts)) {
      return opts.concat(overrides);
    }
    if (overrides && typeof overrides == 'object') {
      const out = {};
      // const keys = {};
      if (opts) {
        for (let i in opts) {
          // keys[i.toLowerCase()] = i;
          // out[i] = opts[i];
          out[i.toLowerCase()] = opts[i];
        }
      }
      for (let i in overrides) {
        // let key = keys[i.toLowerCase()] || i;
        let key = lowerCase ? i.toLowerCase() : i;
        if (key === 'headers') lowerCase = true;
        if (i in out) {
          out[i] = deepMerge(out[i], overrides[i], lowerCase);
        } else {
          out[i] = overrides[i];
        }
      }
      return out;
    }
    return overrides;
  }

  /*
  function extend(target, source, lowerCase) {
    if (source) for (let i in source) {
      let prop = lowerCase ? i.toLowerCase() : i;
      target[prop] = source[i];
    }
    return target;
  }
  */

  /*
  function transform(stack, data, headers) {
    for (let i=0, r; i<stack && stack.length || 0; i++) {
      r = stack[i](data, headers);
      if (r!==undefined) {
        data = r;
      }
    }
    return data;
  }
  */

  // function qs(params) {
  //   let out = '';
  //   for (let i in params) {
  //     if (out) out += '&';
  //     out += encodeURIComponent(i);
  //     out += '=';
  //     out += encodeURIComponent(params[i]);
  //   }
  //   return out;
  // }

  function isOk(status) {
    return status/100|0 === 2;
  }

  function axios(url, data, config) {
    let options = config;
    if (typeof url !== 'string') {
      options = url;
      url = options.url;
    } else if (config === undefined) {
      options = data;
      data = undefined;
    }
    options = deepMerge(defaults, options) || {};

    /*
    config = config || {};
    const headers = assign(
      assign({}, defaults.headers, true),
      config.headers,
      true
    );
    const params = assign(
      assign({}, defaults.params, false),
      config.params,
      false
    );
    */

    /*
    const headers = {};
    if (defaults.headers) for (let i in defaults.headers) {
      headers[i.toLowerCase()] = defaults.headers[i];
    }
    if (config.headers) for (let i in config.headers) {
      headers[i.toLowerCase()] = config.headers[i];
    }
    */

    // data = transform(defaults.transformRequest, data, headers);
    // data = transform(config.transformRequest, data, headers);

    if (options.transformRequest) {
      for (let i = 0; i < options.transformRequest.length; i++) {
        let r = stack[i](data, options.headers);
        if (r !== undefined) {
          data = r;
        }
      }
    }

    if (data && typeof data === 'object') {
      data = JSON.stringify(data);
      options.headers = deepMerge(options.headers, {
        'Content-Type': 'application/json',
      });
    }

    if (options.xsrfCookieName) {
      let parts = document.cookie.split(/ *[;=] */);
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] == options.xsrfCookieName) {
          options.headers[options.xsrfHeaderName] = decodeURIComponent(parts[i+1]);
          break;
        }
      }
    }

    const response = {
      config,
    };
    return fetch(url, {
      authorization: options.auth,
      body: data,
    }).then((res) => {
      for (let i in res) {
        if (typeof res[i] != 'function') response[i] = res[i];
      }
      if (!(options.validateStatus || isOk)(res.status)) {
        return Promise.reject(res);
      }
      const withData = options.responseType === 'stream'
        ? Promise.resolve(res.body)
        : res[options.responseType || 'text']();
      return withData.then((data) => {
        response.data = data;
        return response;
      });
    });
  }

  axios.CancelToken = self.AbortController || Object;

  return axios;
})();
