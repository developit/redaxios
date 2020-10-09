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

// @ts-ignore
import textExample from 'file-loader!./fixtures/example.txt';
// @ts-ignore
import jsonExample from 'file-loader!./fixtures/example.json.txt';
import axios from '../src/index.js';
import fetch from 'isomorphic-fetch';

describe('redaxios', () => {
	describe('basic functionality', () => {
		it('should return text and a 200 status for a simple GET request', async () => {
			const req = axios(textExample);
			expect(req).toBeInstanceOf(Promise);
			const res = await req;
			expect(res).toBeInstanceOf(Object);
			expect(res.status).toEqual(200);
			expect(res.data).toEqual('some example content');
		});

		it('should return a rejected promise for 404 responses', async () => {
			const req = axios('/foo.txt');
			expect(req).toBeInstanceOf(Promise);
			const spy = jasmine.createSpy();
			await req.catch(spy);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ status: 404 }));
		});
	});

	describe('options.responseType', () => {
		it('should parse responses as JSON by default', async () => {
			const res = await axios.get(jsonExample);
			expect(res.data).toEqual({ hello: 'world' });
		});

		it('should fall back to text for non-JSON by default', async () => {
			const res = await axios.get(textExample);
			expect(res.data).toEqual('some example content');
		});

		it('should force JSON for responseType:json', async () => {
			const res = await axios.get(jsonExample, {
				responseType: 'json'
			});
			expect(res.data).toEqual({ hello: 'world' });
		});

		it('should fall back to undefined for failed JSON parse', async () => {
			const res = await axios.get(textExample, {
				responseType: 'json'
			});
			expect(res.data).toEqual(undefined);
		});

		it('should still parse JSON when responseType:text', async () => {
			// this is just how axios works
			const res = await axios.get(jsonExample, {
				responseType: 'text'
			});
			expect(res.data).toEqual({ hello: 'world' });
		});
	});

	describe('options.baseURL', () => {
		it('should resolve URLs relative to baseURL if provided', async () => {
			const oldFetch = window.fetch;
			try {
				window.fetch = jasmine
					.createSpy('fetch')
					.and.returnValue(Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') }));
				const req = axios.get('/bar', {
					baseURL: 'http://foo'
				});
				expect(window.fetch).toHaveBeenCalledTimes(1);
				expect(window.fetch).toHaveBeenCalledWith(
					'http://foo/bar',
					jasmine.objectContaining({
						method: 'get',
						headers: {},
						body: undefined
					})
				);
				const res = await req;
				expect(res.status).toEqual(200);
			} finally {
				window.fetch = oldFetch;
			}
		});

		it('should resolve baseURL for relative URIs', async () => {
			const oldFetch = window.fetch;
			try {
				window.fetch = jasmine
					.createSpy('fetch')
					.and.returnValue(Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') }));
				const req = axios.get('/bar', {
					baseURL: '/foo'
				});
				expect(window.fetch).toHaveBeenCalledTimes(1);
				expect(window.fetch).toHaveBeenCalledWith(
					'/foo/bar',
					jasmine.objectContaining({
						method: 'get',
						headers: {},
						body: undefined
					})
				);
				const res = await req;
				expect(res.status).toEqual(200);
			} finally {
				window.fetch = oldFetch;
			}
		});
	});

	describe('options.headers', () => {
		it('should merge headers case-insensitively', async () => {
			const oldFetch = window.fetch;
			try {
				const fetch = (window.fetch = jasmine.createSpy('fetch').and.returnValue(
					Promise.resolve({
						ok: true,
						status: 200,
						text: () => Promise.resolve('yep')
					})
				));
				await axios('/', { headers: { 'x-foo': '2' } });
				expect(fetch.calls.first().args[1].headers).toEqual({
					'x-foo': '2'
				});

				fetch.calls.reset();

				await axios('/', { headers: { 'x-foo': '2', 'X-Foo': '4' } });
				expect(fetch.calls.first().args[1].headers).toEqual({
					'x-foo': '4'
				});

				fetch.calls.reset();

				const request = axios.create({
					headers: {
						'Base-Upper': 'base',
						'base-lower': 'base'
					}
				});
				await request('/');
				expect(fetch.calls.first().args[1].headers).toEqual({
					'base-upper': 'base',
					'base-lower': 'base'
				});

				fetch.calls.reset();

				await request('/', {
					headers: {
						'base-upper': 'replaced',
						'BASE-LOWER': 'replaced'
					}
				});
				expect(fetch.calls.first().args[1].headers).toEqual({
					'base-upper': 'replaced',
					'base-lower': 'replaced'
				});
			} finally {
				window.fetch = oldFetch;
			}
		});
	});

	describe('options.body (request bodies)', () => {
		let oldFetch, fetchMock;
		beforeEach(() => {
			oldFetch = window.fetch;
			fetchMock = window.fetch = jasmine.createSpy('fetch').and.returnValue(
				Promise.resolve({
					ok: true,
					status: 200,
					text: () => Promise.resolve('yep')
				})
			);
		});
		afterEach(() => {
			window.fetch = oldFetch;
		});

		it('should issue POST requests (with JSON body)', async () => {
			const res = await axios.post('/foo', {
				hello: 'world'
			});
			expect(fetchMock).toHaveBeenCalledWith(
				'/foo',
				jasmine.objectContaining({
					method: 'post',
					headers: {
						'content-type': 'application/json'
					},
					body: '{"hello":"world"}'
				})
			);
			expect(res.status).toEqual(200);
			expect(res.data).toEqual('yep');
		});

		describe('FormData support', () => {
			it('should not send JSON content-type when data contains FormData', async () => {
				const formData = new FormData();
				await axios.post('/foo', formData);
				expect(fetchMock).toHaveBeenCalledWith(
					'/foo',
					jasmine.objectContaining({
						body: formData,
						headers: {}
					})
				);
			});

			it('should preserve global content-type option when using FormData', async () => {
				const data = new FormData();
				data.append('hello', 'world');
				const res = await axios.post('/foo', data, { headers: { 'content-type': 'multipart/form-data' } });
				expect(fetchMock).toHaveBeenCalledTimes(1);
				expect(fetchMock).toHaveBeenCalledWith(
					'/foo',
					jasmine.objectContaining({
						method: 'post',
						headers: {
							'content-type': 'multipart/form-data'
						},
						body: data
					})
				);
				expect(res.status).toEqual(200);
				expect(res.data).toEqual('yep');
			});
		});
	});

	describe('options.fetch', () => {
		it('should accept a custom fetch implementation', async () => {
			const req = axios.get(jsonExample, { fetch });
			expect(req).toBeInstanceOf(Promise);
			const res = await req;
			expect(res).toBeInstanceOf(Object);
			expect(res.status).toEqual(200);
			expect(res.data).toEqual({ hello: 'world' });
		});
	});

	describe('options.params & options.paramsSerializer', () => {
		let oldFetch, fetchMock;
		beforeEach(() => {
			oldFetch = window.fetch;
			fetchMock = window.fetch = jasmine.createSpy('fetch').and.returnValue(Promise.resolve());
		});

		afterEach(() => {
			window.fetch = oldFetch;
		});

		it('should not serialize missing params', async () => {
			axios.get('/foo');
			expect(fetchMock).toHaveBeenCalledWith('/foo', jasmine.any(Object));
		});

		it('should serialize numeric and boolean params', async () => {
			const params = { a: 1, b: true };
			axios.get('/foo', { params });
			expect(fetchMock).toHaveBeenCalledWith('/foo?a=1&b=true', jasmine.any(Object));
		});

		it('should merge params into existing url querystring', async () => {
			const params = { a: 1, b: true };
			axios.get('/foo?c=42', { params });
			expect(fetchMock).toHaveBeenCalledWith('/foo?c=42&a=1&b=true', jasmine.any(Object));
		});

		it('should accept a URLSearchParams instance', async () => {
			const params = new URLSearchParams({ d: 'test' });
			axios.get('/foo', { params });
			expect(fetchMock).toHaveBeenCalledWith('/foo?d=test', jasmine.any(Object));
		});

		it('should accept a custom paramsSerializer function', async () => {
			const params = { a: 1, b: true };
			const paramsSerializer = (params) => 'e=iamthelaw';
			axios.get('/foo', { params, paramsSerializer });
			expect(fetchMock).toHaveBeenCalledWith('/foo?e=iamthelaw', jasmine.any(Object));
		});
	});

	describe('static helpers', () => {
		it(`#all should work`, async () => {
			const result = await axios.all([Promise.resolve('hello'), Promise.resolve('world')]);

			expect(result).toEqual(['hello', 'world']);
		});

		it(`#spread should work`, async () => {
			const result = await axios.all([Promise.resolve('hello'), Promise.resolve('world')]).then(
				axios.spread((item1, item2) => {
					return `${item1} ${item2}`;
				})
			);

			expect(result).toEqual('hello world');
		});
	});
});
