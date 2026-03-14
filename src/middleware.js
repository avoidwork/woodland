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

export function createMiddlewareRegistry(middleware, ignored, methods, cache) {
	let ignoreFn, allowedFn, routesFn, registerFn, listFn;

	function routes(uri, method, override = false) {
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
	routesFn = routes;

	function list(method = GET.toLowerCase(), type = "array") {
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
	listFn = list;

	function allowed(method, uri, override = false) {
		return routesFn(uri, method, override).visible > 0;
	}
	allowedFn = allowed;

	function register(rpath, ...fn) {
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
			ignore: ignoreFn,
			allowed: allowedFn,
			routes: routesFn,
			register: registerFn,
			list: listFn,
		};
	}
	registerFn = register;

	function ignore(fn) {
		ignored.add(fn);

		return {
			ignore: ignoreFn,
			allowed: allowedFn,
			routes: routesFn,
			register: registerFn,
			list: listFn,
		};
	}
	ignoreFn = ignore;

	return {
		ignore: ignoreFn,
		allowed: allowedFn,
		routes: routesFn,
		register: registerFn,
		list: listFn,
	};
}
