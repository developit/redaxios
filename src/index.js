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
 * @property {RequestHeaders} [headers] Request headers
 * @property {FormData|string|object} [body] a body, optionally encoded, to send
 * @property {'text'|'json'|'stream'|'blob'|'arrayBuffer'|'formData'|'stream'} [responseType="json"] An encoding to use for the response
 * @property {Record<string,any>|URLSearchParams} [params] querystring parameters
 * @property {(params: Options['params']) => string} [paramsSerializer] custom function to stringify querystring parameters
 * @property {boolean} [withCredentials] Send the request with credentials like cookies
 * @property {string} [auth] Authorization header value to send with the request
 * @property {string} [xsrfCookieName] Pass an Cross-site Request Forgery prevention cookie value as a header defined by `xsrfHeaderName`
 * @property {string} [xsrfHeaderName] The name of a header to use for passing XSRF cookies
 * @property {(status: number) => boolean} [validateStatus] Override status code handling (default: 200-399 is a success)
 * @property {Array<(body: any, headers?: RequestHeaders) => any?>} [transformRequest] An array of transformations to apply to the outgoing request
 * @property {string} [baseURL] a base URL from which to resolve all URLs
 * @property {typeof window.fetch} [fetch] Custom window.fetch implementation
 * @property {any} [data]
 */

/**
 * @public
 * @typedef RequestHeaders
 * @type {{[name: string]: string} | Headers}
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

/**
 * @typedef BodylessMethod
 * @type {<T=any>(url: string, config?: Options) => Promise<Response<T>>}
 */

/**
 * @typedef BodyMethod
 * @type {<T=any>(url: string, body?: any, config?: Options) => Promise<Response<T>>}
 */

/**
 * @public
 * @param {Options} [defaults = {}]
 * @returns {redaxios}
 */
function create(defaults) {
	defaults = defaults || {};

	/**
	 * @public
	 * @template T
	 * @type {(<T = any>(config?: Options) => Promise<Response<T>>) | (<T = any>(url: string, config?: Options) => Promise<Response<T>>)}
	 */
	redaxios.request = redaxios;

	/** @public @type {BodylessMethod} */
	redaxios.get = (url, config) => redaxios(url, config, 'get');

	/** @public @type {BodylessMethod} */
	redaxios.delete = (url, config) => redaxios(url, config, 'delete');

	/** @public @type {BodylessMethod} */
	redaxios.head = (url, config) => redaxios(url, config, 'head');

	/** @public @type {BodylessMethod} */
	redaxios.options = (url, config) => redaxios(url, config, 'options');

	/** @public @type {BodyMethod} */
	redaxios.post = (url, data, config) => redaxios(url, config, 'post', data);

	/** @public @type {BodyMethod} */
	redaxios.put = (url, data, config) => redaxios(url, config, 'put', data);

	/** @public @type {BodyMethod} */
	redaxios.patch = (url, data, config) => redaxios(url, config, 'patch', data);

	/** @public */
	redaxios.all = Promise.all.bind(Promise);

	/**
	 * @public
	 * @template Args, R
	 * @param {(...args: Args[]) => R} fn
	 * @returns {(array: Args[]) => R}
	 */
	redaxios.spread = (fn) => /** @type {any} */ (fn.apply.bind(fn, fn));

	/**
	 * @private
	 * @template T, U
	 * @param {T} opts
	 * @param {U} [overrides]
	 * @param {boolean} [lowerCase]
	 * @returns {{} & (T | U)}
	 */
	function deepMerge(opts, overrides, lowerCase) {
		let out = /** @type {any} */ ({}),
			i;
		if (Array.isArray(opts)) {
			// @ts-ignore
			return opts.concat(overrides);
		}
		for (i in opts) {
			const key = lowerCase ? i.toLowerCase() : i;
			out[key] = opts[i];
		}
		for (i in overrides) {
			const key = lowerCase ? i.toLowerCase() : i;
			const value = /** @type {any} */ (overrides)[i];
			out[key] = key in out && typeof value == 'object' ? deepMerge(out[key], value, key == 'headers') : value;
		}
		return out;
	}

	/**
	 * Issues a request.
	 * @public
	 * @template T
	 * @param {string | Options} urlOrConfig
	 * @param {Options} [config = {}]
	 * @param {any} [_method] (internal)
	 * @param {any} [data] (internal)
	 * @param {never} [_undefined] (internal)
	 * @returns {Promise<Response<T>>}
	 */
	function redaxios(urlOrConfig, config, _method, data, _undefined) {
		let url = /** @type {string} */ (typeof urlOrConfig != 'string' ? (config = urlOrConfig).url : urlOrConfig);

		const response = /** @type {Response<any>} */ ({ config });

		/** @type {Options} */
		const options = deepMerge(defaults, config);

		/** @type {RequestHeaders} */
		const customHeaders = {};

		data = data || options.data;

		(options.transformRequest || []).map((f) => {
			data = f(data, options.headers) || data;
		});

		if (options.auth) {
			customHeaders.authorization = options.auth;
		}

		if (data && typeof data === 'object' && typeof data.append !== 'function' && typeof data.text !== 'function') {
			data = JSON.stringify(data);
			customHeaders['content-type'] = 'application/json';
		}

		try {
			// @ts-ignore providing the cookie name without header name is nonsensical anyway
			customHeaders[options.xsrfHeaderName] = decodeURIComponent(
				// @ts-ignore accessing match()[2] throws for no match, which is intentional
				document.cookie.match(RegExp('(^|; )' + options.xsrfCookieName + '=([^;]*)'))[2]
			);
		} catch (e) {}

		if (options.baseURL) {
			url = url.replace(/^(?!.*\/\/)\/?/, options.baseURL + '/');
		}

		if (options.params) {
			url +=
				(~url.indexOf('?') ? '&' : '?') +
				(options.paramsSerializer ? options.paramsSerializer(options.params) : new URLSearchParams(options.params));
		}

		const fetchFunc = options.fetch || fetch;

		return fetchFunc(url, {
			method: (_method || options.method || 'get').toUpperCase(),
			body: data,
			headers: deepMerge(options.headers, customHeaders, true),
			credentials: options.withCredentials ? 'include' : _undefined
		}).then((res) => {
			for (const i in res) {
				if (typeof res[i] != 'function') response[i] = res[i];
			}

			if (options.responseType == 'stream') {
				response.data = res.body;
				return response;
			}

			return res[options.responseType || 'text']()
				.then((data) => {
					response.data = data;
					// its okay if this fails: response.data will be the unparsed value:
					response.data = JSON.parse(data);
				})
				.catch(Object)
				.then(() => {
					const ok = options.validateStatus ? options.validateStatus(res.status) : res.ok;
					return ok ? response : Promise.reject(response);
				});
		});
	}

	/**
	 * @public
	 * @type {AbortController}
	 */
	redaxios.CancelToken = /** @type {any} */ (typeof AbortController == 'function' ? AbortController : Object);

	/**
	 * @public
	 * @type {Options}
	 */
	redaxios.defaults = defaults;

	/**
	 * @public
	 */
	redaxios.create = create;

	return redaxios;
}

export default create();
