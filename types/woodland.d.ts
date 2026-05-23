import { EventEmitter } from "node:events";

export interface WoodlandConfig {
	autoIndex?: boolean;
	bodyLimit?: number;
	cacheSize?: number;
	cacheTTL?: number;
	charset?: string;
	corsExpose?: string;
	defaultHeaders?: Record<string, string>;
	digit?: number;
	disableTrace?: boolean;
	etags?: boolean;
	exposeErrorMessages?: boolean;
	indexes?: string[];
	logging?: object;
	origins?: string[];
	silent?: boolean;
	time?: boolean;
}

export interface FileDescriptor {
	charset: string;
	etag: string;
	path: string;
	stats: {
		mtime: Date;
		size: number;
	};
}

export interface RouteInfo {
	params?: boolean;
	getParams?: RegExp | null;
	middleware: Function[];
	exit: number;
	visible: number;
}

export class Woodland extends EventEmitter {
	// Public read-only properties (getters)
	readonly logger: Readonly<{
		log: (...args: any[]) => void;
		logError: (...args: any[]) => void;
		logRoute: (...args: any[]) => void;
		logMiddleware: (...args: any[]) => void;
		logDecoration: (...args: any[]) => void;
		logServe: (...args: any[]) => void;
		clf: (...args: any[]) => string;
	}>;

	// Public error handler property (getter/setter)
	error: ((err: Error, req: any, res: any) => void) | null;

	constructor(config?: WoodlandConfig);

	// Public routing methods - with path
	always(rpath: string, ...fn: Function[]): Woodland;
	connect(rpath: string, ...fn: Function[]): Woodland;
	delete(rpath: string, ...fn: Function[]): Woodland;
	get(rpath: string, ...fn: Function[]): Woodland;
	options(rpath: string, ...fn: Function[]): Woodland;
	patch(rpath: string, ...fn: Function[]): Woodland;
	post(rpath: string, ...fn: Function[]): Woodland;
	put(rpath: string, ...fn: Function[]): Woodland;
	trace(rpath: string, ...fn: Function[]): Woodland;

	// Public routing methods - without path (handler only)
	always(...fn: Function[]): Woodland;
	connect(...fn: Function[]): Woodland;
	delete(...fn: Function[]): Woodland;
	get(...fn: Function[]): Woodland;
	options(...fn: Function[]): Woodland;
	patch(...fn: Function[]): Woodland;
	post(...fn: Function[]): Woodland;
	put(...fn: Function[]): Woodland;
	trace(...fn: Function[]): Woodland;

	// Middleware methods
	ignore(fn: Function): Woodland;
	list(method?: string, type?: string): any | any[];
	mount(path: string): Router;
	use(rpath: string | Function, ...fn: Function[]): Woodland;
	use(rpath: string, ...fn: (Function | string)[]): Woodland;
	use(rpath: string, subApp: Woodland): Woodland;

	// Utility methods
	etag(method: string, ...args: any[]): string;
	files(root?: string, folder?: string): Woodland;
	route(req: any, res: any): void;
	routes(uri: string, method: string, override?: boolean): RouteInfo;
	serve(req: any, res: any, arg: string, folder?: string): Promise<void>;
	stream(req: any, res: any, file?: FileDescriptor): void;

}

export function woodland(arg?: WoodlandConfig): Woodland;

export default woodland;

export class Router {
	parent: Woodland;
	prefix: string;
	routeMap: Map<string, Map<string, Function[] | Router>>;

	constructor(parent: Woodland, prefix: string);

	// Routing methods - with path
	always(path: string, ...fn: Function[]): Router;
	connect(path: string, ...fn: Function[]): Router;
	delete(path: string, ...fn: Function[]): Router;
	get(path: string, ...fn: Function[]): Router;
	options(path: string, ...fn: Function[]): Router;
	patch(path: string, ...fn: Function[]): Router;
	post(path: string, ...fn: Function[]): Router;
	put(path: string, ...fn: Function[]): Router;
	trace(path: string, ...fn: Function[]): Router;

	// Middleware methods
	ignore(fn: Function): Router;
}
