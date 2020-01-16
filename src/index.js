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

/**
 * @typedef Options
 * @property {string} [url] the URL to request
 * @property {string} [method="get"] HTTP method, case-insensitive
 * @property {Headers} [headers] Request headers
 * @property {'text'|'json'|'stream'|'blob'|'arrayBuffer'|'formData'|'stream'} [responseType="text"] An encoding to use for the response
 * @property {string} [auth] Authorization header value to send with the request
 * @property {string} [xsrfCookieName] Pass an Cross-site Request Forgery prevention cookie value as a header defined by `xsrfHeaderName`
 * @property {string} [xsrfHeaderName] The name of a header to use for passing XSRF cookies
 * @property {(status: number) => boolean} [validateStatus] Override status code handling (default: 200-399 is a success)
 * @property {Array<(body: any, headers: Headers) => any?>} [transformRequest] An array of transformations to apply to the outgoing request
 */

/**
 * @typedef Headers
 * @type {{[name: string]: string}}
 */

/**
 * @typedef Response
 * @property {Options} config the resolved request configuration
 * @property {FormData|string|object} [body] a body, optionally encoded, to send
 */

export default (function create(defaults) {
	defaults = defaults || {};

	/**
	 * Creates a request factory bound to the given HTTP method.
	 * @param {string} method
	 * @param {boolean} allowBody
	 * @returns {(url: string, config?: Options, body?) => Promise<Response>}
	 */
	function createMethod(method, allowBody) {
		return (url, config, alt) => {
			let data;
			if (allowBody) {
				data = config;
				config = alt;
			}
			config = Object.assign({ method }, config);
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

	// hmmm.
	axios.all = Promise.all;
	axios.spread = function(fn) {
		return function (results) {
			return fn.apply(this, results);
		};
	};

	function deepMerge(opts, overrides, lowerCase) {
		if (Array.isArray(opts)) {
			return opts.concat(overrides);
		}
		if (overrides && typeof overrides == 'object') {
			let out = {}, i;
			if (opts) {
				for (i in opts) {
					let key = lowerCase ? i.toLowerCase() : i;
					out[key] = opts[i];
				}
			}
			for (i in overrides) {
				let key = lowerCase ? i.toLowerCase() : i;
				if (key === 'headers') lowerCase = true;
				if (i in out) {
					out[key] = deepMerge(out[key], overrides[i], lowerCase);
				}
				else {
					out[key] = overrides[i];
				}
			}
			return out;
		}
		return overrides;
	}

	function isOk(status) {
		return (status/100|0) === 2;
	}

	/**
	 * Issues a request.
	 * @param {string} url the URL to fetch
	 * @param {any} [data] request body to send
	 * @param {Options} [config] configuration for the request
	 * @returns {Promise<Response>}
	 */
	function axios(url, data, config) {
		let options = config;
		if (typeof url !== 'string') {
			options = url;
			url = options.url;
		}
		else if (config === undefined) {
			options = data;
			data = undefined;
		}
		options = deepMerge(defaults, options) || {};

		if (options.transformRequest) {
			for (let i = 0; i < options.transformRequest.length; i++) {
				let r = options.transformRequest[i](data, options.headers);
				if (r !== undefined) {
					data = r;
				}
			}
		}

		const customHeaders = {};

		if (data && typeof data === 'object') {
			data = JSON.stringify(data);
			customHeaders['Content-Type'] = 'application/json';
		}

		if (options.xsrfCookieName) {
			let parts = document.cookie.split(/ *[;=] */);
			for (let i = 0; i < parts.length; i += 2) {
				if (parts[i] == options.xsrfCookieName) {
					customHeaders[options.xsrfHeaderName] = decodeURIComponent(parts[i+1]);
					break;
				}
			}
		}

		if (options.auth) {
			customHeaders.Authorization = options.auth;
		}

		const response = {
			config
		};
		return fetch(url, {
			method: options.method,
			body: data,
			headers: deepMerge(options.headers, customHeaders, true)
		}).then((res) => {
			let i;
			for (i in res) {
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
