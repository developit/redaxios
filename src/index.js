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
 * @public
 * @typedef Options
 * @property {string} [url] the URL to request
 * @property {string} [method="get"] HTTP method, case-insensitive
 * @property {Headers} [headers] Request headers
 * @property {FormData|string|object} [body] a body, optionally encoded, to send
 * @property {'text'|'json'|'stream'|'blob'|'arrayBuffer'|'formData'|'stream'} [responseType="text"] An encoding to use for the response
 * @property {string} [auth] Authorization header value to send with the request
 * @property {string} [xsrfCookieName] Pass an Cross-site Request Forgery prevention cookie value as a header defined by `xsrfHeaderName`
 * @property {string} [xsrfHeaderName] The name of a header to use for passing XSRF cookies
 * @property {(status: number) => boolean} [validateStatus] Override status code handling (default: 200-399 is a success)
 * @property {Array<(body: any, headers: Headers) => any?>} [transformRequest] An array of transformations to apply to the outgoing request
 */

/**
 * @public
 * @typedef Headers
 * @type {{[name: string]: string}}
 */

/**
 * @public
 * @typedef Response
 * @property {Options} config the request configuration
 * @property {any} data the decoded response body
 */

/** */
export default (function create(defaults) {
	defaults = defaults || {};

	/**
	 * Creates a request factory bound to the given HTTP method.
	 * @private
	 * @param {string} method
	 * @returns {(url: string, config?: Options) => Promise<Response>}
	 */
	function createBodylessMethod(method) {
		return (url, config) => redaxios(url, Object.assign({ method }, config));
	}

	/**
	 * Creates a request factory bound to the given HTTP method.
	 * @private
	 * @param {string} method
	 * @returns {(url: string, body?: any, config?: Options) => Promise<Response>}
	 */
	function createBodyMethod(method) {
		return (url, data, config) => redaxios(url, Object.assign({ method, data }, config));
	}

	/**
	 * @public
	 * @type {((config?: Options) => Promise<Response>) | ((url: string, config?: Options) => Promise<Response>)}
	 */
	redaxios.request = redaxios;

	/** @public */
	redaxios.get = createBodylessMethod('get');

	/** @public */
	redaxios.delete = createBodylessMethod('delete');

	/** @public */
	redaxios.options = createBodylessMethod('options');

	/** @public */
	redaxios.post = createBodyMethod('post');

	/** @public */
	redaxios.put = createBodyMethod('put');

	/** @public */
	redaxios.patch = createBodyMethod('patch');

	/** @public */
	redaxios.all = Promise.all;

	/** @public */
	redaxios.spread = function(fn) {
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
				out[key] = i in out ? deepMerge(out[key], overrides[i], lowerCase) : overrides[i];
			}
			return out;
		}
		return overrides;
	}

	/**
	 * Issues a request.
	 * @public
	 * @param {string} [url]
	 * @param {Options} [config]
	 * @returns {Promise<Response>}
	 */
	function redaxios(url, config) {
		if (typeof url !== 'string') {
			config = url;
			url = config.url;
		}
		const {
			transformRequest,
			headers,
			xsrfCookieName,
			auth,
			method,
			validateStatus,
			responseType,
			data: optionData,
			xsrfHeaderName
		} = deepMerge(defaults, config || {});
		let body = optionData;
		if (transformRequest) {
			for (let i = 0; i < transformRequest.length; i++) {
				let r = transformRequest[i](body, headers);
				if (r !== undefined) {
					body = r;
				}
			}
		}

		let customHeaders = {};

		if (body && typeof body === 'object') {
			body = JSON.stringify(body);
			customHeaders = {
				...customHeaders,
				'Content-Type': 'application/json'
			};
		}

		if (xsrfCookieName) {
			let parts = document.cookie.split(/ *[;=] */);
			for (let i = 0; i < parts.length; i += 2) {
				if (parts[i] == xsrfCookieName) {
					customHeaders = {
					  ...customHeaders,
					  [xsrfHeaderName]: decodeURIComponent(parts[i + 1])
					};
					break;
				}
			}
		}

		if (auth) {
			customHeaders = {
				...customHeaders,
				Authorization: auth
			};
		}

		/** @type {Response} */
		let response = {
			config
		};
		// response.config = config;

		return fetch(url, {
			method,
			body,
			headers: deepMerge(headers, customHeaders, true)
		}).then((res) => {
			let i;
			for (i in res) {
				if (typeof res[i] != 'function') response[i] = res[i];
			}
			if (!(validateStatus ? validateStatus(res.status) : res.ok)) {
				return Promise.reject(res);
			}
			const withData = responseType === 'stream'
				? Promise.resolve(res.body)
				: res[responseType || 'text']();
			return withData.then((data) => {
				response = {
					...response,
					data
				};
				return response;
			});
		});
	}

	redaxios.CancelToken = self.AbortController || Object;

	redaxios.create = create;

	return redaxios;
})();
