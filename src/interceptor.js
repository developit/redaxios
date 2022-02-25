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