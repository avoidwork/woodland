import {
	ARRAY,
	DELIMITER,
	FUNCTION,
	GET,
	HEAD,
	INT_0,
	LEFT_PAREN,
	NODE_METHODS,
	SLASH,
	STRING,
	WILDCARD,
} from "./constants.js";
import { getStatus, getStatusText } from "./response.js";
import { extractPath } from "./request.js";

/**
 * Processes middleware map for a given URI and populates middleware array
 * @param {string} uri - The URI to match against
 * @param {Map} [map=new Map()] - Map of middleware handlers
 * @param {Object} [arg={}] - Object containing middleware array and parameters
 */
export function reduce(uri, map = new Map(), arg = {}) {
	if (!map.size) {
		return;
	}

	const middlewareArray = arg.middleware;
	let paramsFound = arg.params;
	const values = Array.from(map.values());
	const len = values.length;

	for (let i = 0; i < len; i++) {
		const middleware = values[i];
		middleware.regex.lastIndex = 0;

		if (middleware.regex.test(uri)) {
			const handlers = middleware.handlers;
			const handlerLen = handlers.length;

			if (handlerLen === 1) {
				middlewareArray.push(handlers[0]);
			} else {
				for (let j = 0; j < handlerLen; j++) {
					middlewareArray.push(handlers[j]);
				}
			}

			if (middleware.params && !paramsFound) {
				arg.params = true;
				arg.getParams = middleware.regex;
				paramsFound = true;
			}
		}
	}
}

const ERROR_HANDLER_LENGTH = 4;

/**
 * Creates a next function for middleware processing with error handling
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {Iterator} middleware - The middleware iterator
 * @param {boolean} [immediate=false] - Whether to execute immediately or on next tick
 * @returns {Function} The next function for middleware chain
 */
export function next(req, res, middleware, immediate = false) {
	/**
	 * Handles errors by finding error handler middleware
	 * @param {Error} err - The error to handle
	 * @param {Function} nextFn - Next function for chain
	 */
	const handleError = (err, nextFn) => {
		let obj = middleware.next();

		while (obj.done === false && obj.value && obj.value.length !== ERROR_HANDLER_LENGTH) {
			obj = middleware.next();
		}

		if (obj.done === false && obj.value) {
			obj.value(err, req, res, nextFn);
		} else {
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(getStatusText(newStatus)));
		}
	};

	/**
	 * Handles regular middleware execution
	 * @param {Function} nextFn - Next function for chain
	 */
	const handleMiddleware = (nextFn) => {
		const obj = middleware.next();

		if (obj.done === false) {
			const value = obj.value;
			if (typeof value === FUNCTION) {
				value(req, res, nextFn);
			} else {
				res.send(value);
			}
		} else {
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(getStatusText(newStatus)));
		}
	};

	/**
	 * Executes middleware chain with error handling
	 * @param {Error} [err] - Optional error to trigger error handling
	 */
	const execute = (err) => {
		if (err !== void 0) {
			handleError(err, execute);
		} else {
			handleMiddleware(execute);
		}
	};

	return immediate ? execute : (err) => process.nextTick(() => execute(err));
}

/**
 * Computes route information for a given URI and method
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {string} uri - The URI to match
 * @param {string} method - HTTP method
 * @param {Object|Map} cache - Cache for route results
 * @param {boolean} [override=false] - Whether to override cache
 * @returns {Object} Route information object
 */
export function computeRoutes(middleware, ignored, uri, method, cache, override = false) {
	const key = `${method}${DELIMITER}${uri}`;
	const cached = override === false ? cache.get(key) : void 0;
	let result;

	if (cached !== void 0) {
		result = cached;
	} else {
		result = { getParams: null, middleware: [], params: false, visible: 0, exit: -1 };
		reduce(uri, middleware.get(WILDCARD) ?? new Map(), result);

		if (method !== WILDCARD) {
			result.exit = result.middleware.length;
			reduce(uri, middleware.get(method) ?? new Map(), result);
		}

		let visible = 0;
		for (let i = 0; i < result.middleware.length; i++) {
			if (!ignored.has(result.middleware[i])) {
				visible++;
			}
		}
		result.visible = visible;
		cache.set(key, result);
	}

	return result;
}

/**
 * Lists middleware routes for a given method
 * @param {Map} middleware - Map of middleware by method
 * @param {string} [method=get] - HTTP method to list
 * @param {string} [type=array] - Return type (array or object)
 * @returns {Array|Object} List of routes
 */
export function listRoutes(middleware, method = GET.toLowerCase(), type = ARRAY) {
	const methodMap = middleware.get(method.toUpperCase());

	if (!methodMap) {
		return type === ARRAY ? [] : {};
	}

	if (type === ARRAY) {
		return [...methodMap.keys()];
	}

	const result = {};
	const entries = Array.from(methodMap.entries());
	const entryCount = entries.length;

	for (let i = 0; i < entryCount; i++) {
		const [key, value] = entries[i];
		result[key] = value;
	}

	return result;
}

/**
 * Checks if a method is allowed for a given URI
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Object|Map} cache - Cache for route results
 * @param {string} method - HTTP method
 * @param {string} uri - The URI to check
 * @param {boolean} [override=false] - Whether to override cache
 * @returns {boolean} True if allowed
 */
export function checkAllowed(middleware, ignored, cache, method, uri, override = false) {
	return computeRoutes(middleware, ignored, uri, method, cache, override).visible > INT_0;
}

/**
 * Creates a registry object with middleware management methods
 * @param {Set} methods - Set of registered HTTP methods
 * @param {Object|Map} cache - Cache for route results
 * @returns {Object} Registry object with ignore, allowed, routes, register, list methods
 */
export function createMiddlewareRegistry(methods, cache) {
	const middleware = new Map();
	const ignored = new Set();

	return {
		ignore: (f) => {
			ignored.add(f);
		},
		allowed: (m, u, o) => checkAllowed(middleware, ignored, cache, m, u, o),
		routes: (u, m, o) => computeRoutes(middleware, ignored, u, m, cache, o),
		register: (p, ...fns) => registerMiddleware(middleware, ignored, methods, cache, p, ...fns),
		list: (m, t) => listRoutes(middleware, m, t),
	};
}

/**
 * Registers middleware for a route
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Set} methods - Set of registered HTTP methods
 * @param {Object|Map} cache - Cache for route results
 * @param {string|Function} rpath - Route path or middleware function
 * @param {...Function} fn - Middleware functions to register
 */
export function registerMiddleware(middleware, ignored, methods, cache, rpath, ...fn) {
	if (rpath === void 0) {
		return;
	}

	if (typeof rpath === FUNCTION) {
		fn = [rpath, ...fn];
		rpath = `/.${WILDCARD}`;
	}

	const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

	if (method !== WILDCARD && NODE_METHODS.includes(method) === false) {
		throw new TypeError("Invalid HTTP method");
	}

	if (method === HEAD) {
		throw new TypeError("Cannot set HEAD route, use GET");
	}

	if (middleware.has(method) === false) {
		if (method !== WILDCARD) {
			methods.add(method);
		}

		middleware.set(method, new Map());
	}

	const mmethod = middleware.get(method);
	let lrpath = rpath,
		lparams = false;

	if (lrpath.includes(`${SLASH}${LEFT_PAREN}`) === false && lrpath.includes(`${SLASH}:`)) {
		lparams = true;
		lrpath = extractPath(lrpath);
	}

	const current = mmethod.get(lrpath) ?? { handlers: [] };

	// Validate route pattern before mutating handlers
	const quantifierPattern = /([.*+?^${}()|[\]\\])\1{3,}/;
	/* node:coverage ignore next 3 */
	if (quantifierPattern.test(lrpath)) {
		throw new TypeError("Invalid route pattern: potential ReDoS vulnerability");
	}

	current.handlers.push(...fn);
	mmethod.set(lrpath, {
		handlers: current.handlers,
		params: lparams,
		regex: new RegExp(`^${lrpath}$`),
	});
}
