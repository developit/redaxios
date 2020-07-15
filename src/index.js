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
 * @property {'get'|'post'|'put'|'patch'|'delete'|'options'|'head'|'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'|'HEAD'} [method="get"] HTTP method, case-insensitive
 * @property {Headers} [headers] Request headers
 * @property {FormData|string|object} [body] a body, optionally encoded, to send
 * @property {'text'|'json'|'stream'|'blob'|'arrayBuffer'|'formData'|'stream'} [responseType="text"] An encoding to use for the response
 * @property {boolean} [withCredentials] Send the request with credentials like cookies
 * @property {string} [auth] Authorization header value to send with the request
 * @property {string} [xsrfCookieName] Pass an Cross-site Request Forgery prevention cookie value as a header defined by `xsrfHeaderName`
 * @property {string} [xsrfHeaderName] The name of a header to use for passing XSRF cookies
 * @property {(status: number) => boolean} [validateStatus] Override status code handling (default: 200-399 is a success)
 * @property {Array<(body: any, headers: Headers) => any?>} [transformRequest] An array of transformations to apply to the outgoing request
 * @property {string} [baseURL] a base URL from which to resolve all URLs
 * @property {typeof window.fetch} [fetch] Custom window.fetch implementation
 * @property {any} [data]
 */

/**
 * @public
 * @typedef Headers
 * @type {{[name: string]: string}}
 */

/**
 * @public
 * @template T
 * @typedef Response
 * @property {number} status
 * @property {string} statusText
 * @property {Options} config the request configuration
 * @property {T} data the decoded response body
 * @property {Headers} headers
 * @property {boolean} redirect
 * @property {string} url
 * @property {ResponseType} type
 * @property {ReadableStream<Uint8Array> | null} body
 * @property {boolean} bodyUsed
 */

/** */
export default (function create(/** @type {Options} */ defaults) {
	defaults = defaults || {};

	/**
	 * Creates a request factory bound to the given HTTP method.
	 * @private
	 * @template T
	 * @param {string} method
	 * @returns {<T=any>(url: string, config?: Options) => Promise<Response<T>>}
	 */
	function createBodylessMethod(method) {
		return (url, config) => redaxios(url, Object.assign({ method }, config));
	}

	/**
	 * Creates a request factory bound to the given HTTP method.
	 * @private
	 * @template T
	 * @param {string} method
	 * @returns {<T=any>(url: string, body?: any, config?: Options) => Promise<Response<T>>}
	 */
	function createBodyMethod(method) {
		return (url, data, config) => redaxios(url, Object.assign({ method, data }, config));
	}

	/**
	 * @public
	 * @template T
	 * @type {(<T = any>(config?: Options) => Promise<Response<T>>) | (<T = any>(url: string, config?: Options) => Promise<Response<T>>)}
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

	/**
	 * @public
	 * @template T,R
	 * @param {(...args: T[]) => R} fn
	 * @returns {(array: T[]) => R}
	 */
	redaxios.spread = function (fn) {
		return function (results) {
			return fn.apply(this, results);
		};
	};

	/**
	 * @private
	 * @param {Record<string,any>} opts
	 * @param {Record<string,any>} overrides
	 * @param {boolean} [lowerCase]
	 * @returns {Record<string,any>}
	 */
	function deepMerge(opts, overrides, lowerCase) {
		if (Array.isArray(opts)) {
			return opts.concat(overrides);
		}
		if (overrides && typeof overrides == 'object') {
			let out = /** @type {Record<string,any>} */ ({}),
				i;
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
	 * @template T
	 * @param {string | Options} url
	 * @param {Options} [config]
	 * @returns {Promise<Response<T>>}
	 */
	function redaxios(url, config) {
		if (typeof url !== 'string') {
			config = url;
			url = config.url;
		}

		/**
		 * @type {Options}
		 */
		const options = deepMerge(defaults, config || {});
		let data = options.data;

		if (options.transformRequest) {
			for (let i = 0; i < options.transformRequest.length; i++) {
				let r = options.transformRequest[i](data, options.headers);
				if (r !== undefined) {
					data = r;
				}
			}
		}

		const fetchFunc = options.fetch || fetch;
		/**
		 * @type {{'Content-Type':'application/json';Authorization: string} & Headers}
		 */
		const customHeaders = {};

		if (data && typeof data === 'object') {
			data = JSON.stringify(data);
			customHeaders['Content-Type'] = 'application/json';
		}

		if (options.xsrfCookieName) {
			let parts = document.cookie.split(/ *[;=] */);
			for (let i = 0; i < parts.length; i += 2) {
				if (parts[i] == options.xsrfCookieName) {
					customHeaders[options.xsrfHeaderName] = decodeURIComponent(parts[i + 1]);
					break;
				}
			}
		}

		if (options.auth) {
			customHeaders.Authorization = options.auth;
		}

		if (options.baseURL) {
			url = new URL(url, options.baseURL);
		}

		/** @type {Response<any>} */
		const response = {};
		response.config = /** @type {Options} */ (config);

		return fetchFunc(url, {
			method: options.method,
			body: data,
			headers: deepMerge(options.headers, customHeaders, true),
			credentials: options.withCredentials && 'include'
		}).then((res) => {
			let i;
			for (i in res) {
				if (typeof res[i] != 'function') response[i] = res[i];
			}
			if (!(options.validateStatus ? options.validateStatus(res.status) : res.ok)) {
				return Promise.reject(res);
			}
			const withData =
				options.responseType === 'stream' ? Promise.resolve(res.body) : res[options.responseType || 'text']();
			return withData.then((data) => {
				response.data = data;
				return response;
			});
		});
	}

	/**
	 * @public
	 * @type {AbortController}
	 */
	redaxios.CancelToken = /** @type {any} */ (self).AbortController || Object;

	/**
	 * @public
	 */
	redaxios.create = create;

	return redaxios;
})();
