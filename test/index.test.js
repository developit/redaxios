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

// import sinon from 'sinon';
import axios from '../src/index.js';
import textExample from 'file-loader!./fixtures/example.txt';
import jsonExample from 'file-loader!./fixtures/example.json.txt';
import fetch from 'isomorphic-fetch';

describe('redaxios', () => {
	it('smoke test', () => {
		expect(axios).toBeInstanceOf(Function);
	});

	it('should reject promises for 404', async () => {
		const req = axios('/foo.txt');
		expect(req).toBeInstanceOf(Promise);
		const spy = jasmine.createSpy();
		await req.catch(spy);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ status: 404 }));
	});

	it('should request a file', async () => {
		const req = axios(textExample);
		expect(req).toBeInstanceOf(Promise);
		const res = await req;
		expect(res).toBeInstanceOf(Object);
		expect(res.status).toEqual(200);
		expect(res.data).toEqual('some example content');
	});

	it('should request JSON', async () => {
		const req = axios.get(jsonExample, {
			responseType: 'json'
		});
		expect(req).toBeInstanceOf(Promise);
		const res = await req;
		expect(res).toBeInstanceOf(Object);
		expect(res.status).toEqual(200);
		expect(res.data).toEqual({ hello: 'world' });
	});

	it('should make a request with a baseURL', async () => {
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

	it('should issue POST requests', async () => {
		const oldFetch = window.fetch;
		try {
			window.fetch = jasmine.createSpy('fetch').and.returnValue(
				Promise.resolve({
					ok: true,
					status: 200,
					text: () => Promise.resolve('yep')
				})
			);
			const req = axios.post('/foo', {
				hello: 'world'
			});
			expect(window.fetch).toHaveBeenCalledTimes(1);
			expect(window.fetch).toHaveBeenCalledWith(
				'/foo',
				jasmine.objectContaining({
					method: 'post',
					headers: {
						'content-type': 'application/json'
					},
					body: '{"hello":"world"}'
				})
			);
			const res = await req;
			expect(res.status).toEqual(200);
			expect(res.data).toEqual('yep');
		} finally {
			window.fetch = oldFetch;
		}
	});

	it('should not send JSON content-type when data contains FormData', async () => {
		const oldFetch = window.fetch;
		try {
			window.fetch = jasmine.createSpy('fetch').and.returnValue(Promise.resolve());
			axios.post('/foo', new FormData());
			expect(window.fetch).toHaveBeenCalledTimes(1);
			expect(window.fetch).not.toHaveBeenCalledWith(
				'/foo',
				jasmine.objectContaining({
					headers: {
						'content-type': 'application/json'
					}
				})
			);
		} finally {
			window.fetch = oldFetch;
		}
	});

	it('should preserve global content-type option when using FormData', async () => {
		const oldFetch = window.fetch;
		try {
			window.fetch = jasmine.createSpy('fetch').and.returnValue(
				Promise.resolve({
					ok: true,
					status: 200,
					text: () => Promise.resolve('yep')
				})
			);
			const data = new FormData();
			data.append('hello', 'world');
			const req = axios.post('/foo', data, { headers: { 'content-type': 'multipart/form-data' } });
			expect(window.fetch).toHaveBeenCalledTimes(1);
			expect(window.fetch).toHaveBeenCalledWith(
				'/foo',
				jasmine.objectContaining({
					method: 'post',
					headers: {
						'content-type': 'multipart/form-data'
					},
					body: data
				})
			);
			const res = await req;
			expect(res.status).toEqual(200);
			expect(res.data).toEqual('yep');
		} finally {
			window.fetch = oldFetch;
		}
	});

	it('should accept a custom fetch implementation', async () => {
		const req = axios.get(jsonExample, { fetch });
		expect(req).toBeInstanceOf(Promise);
		const res = await req;
		expect(res).toBeInstanceOf(Object);
		expect(res.status).toEqual(200);
		expect(JSON.parse(res.data)).toEqual({ hello: 'world' });
	});

	it('should support params and paramsSerializer options', async () => {
		const oldFetch = window.fetch;
		window.fetch = jasmine.createSpy('fetch').and.returnValue(Promise.resolve());

		axios.get('/foo');
		expect(window.fetch).toHaveBeenCalledTimes(1);
		expect(window.fetch).toHaveBeenCalledWith('/foo', jasmine.any(Object));

		let params;

		params = { a: 1, b: true };
		axios.get('/foo', { params });
		expect(window.fetch).toHaveBeenCalledTimes(2);
		expect(window.fetch).toHaveBeenCalledWith('/foo?a=1&b=true', jasmine.any(Object));

		axios.get('/foo?c=42', { params });
		expect(window.fetch).toHaveBeenCalledTimes(3);
		expect(window.fetch).toHaveBeenCalledWith('/foo?c=42&a=1&b=true', jasmine.any(Object));

		params = new URLSearchParams({ d: 'test' });
		axios.get('/foo', { params });
		expect(window.fetch).toHaveBeenCalledTimes(4);
		expect(window.fetch).toHaveBeenCalledWith('/foo?d=test', jasmine.any(Object));

		const paramsSerializer = (params) => 'e=iamthelaw';
		axios.get('/foo', { params, paramsSerializer });
		expect(window.fetch).toHaveBeenCalledTimes(5);
		expect(window.fetch).toHaveBeenCalledWith('/foo?e=iamthelaw', jasmine.any(Object));

		window.fetch = oldFetch;
	});
});
