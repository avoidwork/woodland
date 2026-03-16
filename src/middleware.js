import {
	DELIMITER,
	FUNCTION,
	GET,
	HEAD,
	LEFT_PAREN,
	SLASH,
	STRING,
	WILDCARD,
} from "./constants.js";
import { extractPath as pathFn } from "./utility.js";

/**
 * Processes middleware map for a given URI and populates middleware array
 * @param {string} uri - The URI to match against
 * @param {Map} [map=new Map()] - Map of middleware handlers
 * @param {Object} [arg={}] - Object containing middleware array and parameters
 */
export function reduce(uri, map = new Map(), arg = {}) {
	if (map.size === 0) {
		return;
	}

	const middlewareArray = arg.middleware;
	let paramsFound = arg.params;

	for (const middleware of map.values()) {
		middleware.regex.lastIndex = 0;

		if (middleware.regex.test(uri)) {
			const handlers = middleware.handlers;
			const handlerCount = handlers.length;

			if (handlerCount === 1) {
				middlewareArray.push(handlers[0]);
			} else if (handlerCount > 1) {
				middlewareArray.push.apply(middlewareArray, handlers);
			}

			if (middleware.params && paramsFound === false) {
				arg.params = true;
				arg.getParams = middleware.regex;
				paramsFound = true;
			}
		}
	}
}

/**
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
export function getStatus(req, res) {
	if (req.allow.length === 0) {
		return 404;
	}

	if (req.method !== "GET") {
		return 405;
	}

	if (req.allow.includes("GET") === false) {
		return 404;
	}

	return res.statusCode > 500 ? res.statusCode : 500;
}

/**
 * Creates a next function for middleware processing with error handling
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {Iterator} middleware - The middleware iterator
 * @param {boolean} [immediate=false] - Whether to execute immediately or on next tick
 * @returns {Function} The next function for middleware chain
 */
export function next(req, res, middleware, immediate = false) {
	const errorStatus = getStatus(req, res);

	const internalFn = (err, fn) => {
		let obj = middleware.next();

		if (obj.done === false) {
			if (err !== void 0) {
				while (obj.done === false && obj.value && obj.value.length < 4) {
					obj = middleware.next();
				}

				if (obj.done === false && obj.value) {
					obj.value(err, req, res, fn);
				} else {
					res.error(errorStatus);
				}
			} else {
				const value = obj.value;
				if (typeof value === FUNCTION) {
					value(req, res, fn);
				} else {
					res.send(value);
				}
			}
		} else {
			res.error(errorStatus);
		}
	};

	const fn = immediate
		? (err) => internalFn(err, fn)
		: (err) => process.nextTick(() => internalFn(err, fn));

	return fn;
}

/**
 * Computes route information for a given URI and method
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {string} uri - The URI to match
 * @param {string} method - HTTP method
 * @param {Map} cache - Cache for route results
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
			reduce(uri, middleware.get(method) ?? new Map(), result, true);
		}

		result.visible = 0;
		for (let i = 0; i < result.middleware.length; i++) {
			if (ignored.has(result.middleware[i]) === false) {
				result.visible++;
			}
		}
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
export function listRoutes(middleware, method = GET.toLowerCase(), type = "array") {
	let result;

	if (type === "array") {
		result = Array.from(middleware.get(method.toUpperCase()).keys());
	} else if (type === "object") {
		result = {};

		for (const [key, value] of middleware.get(method.toUpperCase()).entries()) {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Checks if a method is allowed for a given URI
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Map} cache - Cache for route results
 * @param {string} method - HTTP method
 * @param {string} uri - The URI to check
 * @param {boolean} [override=false] - Whether to override cache
 * @returns {boolean} True if allowed
 */
export function checkAllowed(middleware, ignored, cache, method, uri, override = false) {
	return computeRoutes(middleware, ignored, uri, method, cache, override).visible > 0;
}

/**
 * Registers middleware for a route
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Array} methods - Array of registered HTTP methods
 * @param {Map} cache - Cache for route results
 * @param {string|Function} rpath - Route path or middleware function
 * @param {...Function} fn - Middleware functions to register
 * @returns {Object} Registry object for chaining
 */
export function registerMiddleware(middleware, ignored, methods, cache, rpath, ...fn) {
	if (typeof rpath === FUNCTION) {
		fn = [rpath, ...fn];
		rpath = `/.${WILDCARD}`;
	}

	const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

	const nodeMethods = [
		"CONNECT",
		"DELETE",
		"GET",
		"HEAD",
		"OPTIONS",
		"PATCH",
		"POST",
		"PUT",
		"TRACE",
	];

	if (method !== WILDCARD && nodeMethods.includes(method) === false) {
		throw new TypeError("Invalid HTTP method");
	}

	if (method === HEAD) {
		throw new TypeError("Cannot set HEAD route, use GET");
	}

	if (middleware.has(method) === false) {
		if (method !== WILDCARD) {
			methods.push(method);
		}

		middleware.set(method, new Map());
	}

	const mmethod = middleware.get(method);
	let lrpath = rpath,
		lparams = false;

	if (lrpath.includes(`${SLASH}${LEFT_PAREN}`) === false && lrpath.includes(`${SLASH}:`)) {
		lparams = true;
		lrpath = pathFn(lrpath);
	}

	const current = mmethod.get(lrpath) ?? { handlers: [] };

	current.handlers.push(...fn);
	mmethod.set(lrpath, {
		handlers: current.handlers,
		params: lparams,
		regex: new RegExp(`^${lrpath}$`),
	});

	return {
		ignore: (f) => ignoreFunction(ignored, f),
		allowed: (m, u, o) => checkAllowed(middleware, ignored, cache, m, u, o),
		routes: (u, m, o) => computeRoutes(middleware, ignored, u, m, cache, o),
		register: (p, ...fns) => registerMiddleware(middleware, ignored, methods, cache, p, ...fns),
		list: (m, t) => listRoutes(middleware, m, t),
	};
}

/**
 * Adds function to ignored set
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Map} middleware - Map of middleware by method
 * @param {Array} methods - Array of registered HTTP methods
 * @param {Map} cache - Cache for route results
 * @param {Function} fn - Function to ignore
 * @returns {Object} Registry object for chaining
 */
export function ignoreFunction(ignored, middleware, methods, cache, fn) {
	ignored.add(fn);

	return {
		ignore: (f) => ignoreFunction(ignored, middleware, methods, cache, f),
		allowed: (m, u, o) => checkAllowed(middleware, ignored, cache, m, u, o),
		routes: (u, m, o) => computeRoutes(middleware, ignored, u, m, cache, o),
		register: (p, ...fns) => registerMiddleware(middleware, ignored, methods, cache, p, ...fns),
		list: (m, t) => listRoutes(middleware, m, t),
	};
}

/**
 * Creates a middleware registry for managing routes and handlers
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Array} methods - Array of registered HTTP methods
 * @param {Map} cache - Cache for route results
 * @returns {Object} Registry object with ignore, allowed, routes, register, list methods
 */
export function createMiddlewareRegistry(middleware, ignored, methods, cache) {
	const registry = {
		ignore: (fn) => {
			ignored.add(fn);
			return registry;
		},
		allowed: (method, uri, override = false) =>
			checkAllowed(middleware, ignored, cache, method, uri, override),
		routes: (uri, method, override = false) =>
			computeRoutes(middleware, ignored, uri, method, cache, override),
		register: (rpath, ...fn) => {
			if (typeof rpath === FUNCTION) {
				fn = [rpath, ...fn];
				rpath = `/.${WILDCARD}`;
			}

			const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

			const nodeMethods = [
				"CONNECT",
				"DELETE",
				"GET",
				"HEAD",
				"OPTIONS",
				"PATCH",
				"POST",
				"PUT",
				"TRACE",
			];

			if (method !== WILDCARD && nodeMethods.includes(method) === false) {
				throw new TypeError("Invalid HTTP method");
			}

			if (method === HEAD) {
				throw new TypeError("Cannot set HEAD route, use GET");
			}

			if (middleware.has(method) === false) {
				if (method !== WILDCARD) {
					methods.push(method);
				}

				middleware.set(method, new Map());
			}

			const mmethod = middleware.get(method);
			let lrpath = rpath,
				lparams = false;

			if (lrpath.includes(`${SLASH}${LEFT_PAREN}`) === false && lrpath.includes(`${SLASH}:`)) {
				lparams = true;
				lrpath = pathFn(lrpath);
			}

			const current = mmethod.get(lrpath) ?? { handlers: [] };

			current.handlers.push(...fn);
			mmethod.set(lrpath, {
				handlers: current.handlers,
				params: lparams,
				regex: new RegExp(`^${lrpath}$`),
			});

			return registry;
		},
		list: (method = GET.toLowerCase(), type = "array") => listRoutes(middleware, method, type),
	};

	return registry;
}
