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

function Interceptor() {

	/**
     * @type {Array<{done: Function, error: Function }>}
     */
	this.handlers = [];

	/**
     * Register an interceptor
     * @param {Function} done
     * @param {Function} [error]
     * @returns {number} The interceptor Id to be used for ejection
     */
	this.use = function(done, error) {
		this.handlers.push({
			done,
			error: error || (() => {})
		});

		return this.handlers.length - 1;
	};

	/**
     * @param {number} id - A registered interceptor Id
     */
	this.eject = function (id) {
		if (this.handlers[id])
			this.handlers[id] = null;
	};
}

export default Interceptor;