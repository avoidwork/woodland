import { EventEmitter } from "node:events";

export interface WoodlandConfig {
	autoIndex?: boolean;
	cacheSize?: number;
	cacheTTL?: number;
	charset?: string;
	corsExpose?: string;
	defaultHeaders?: Record<string, string>;
	digit?: number;
	etags?: boolean;
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
	getParams?: string;
	middleware: Function[];
	exit: number;
	visible: number;
}

export class Woodland extends EventEmitter {
	// Public read-only properties (getters)
	readonly autoIndex: boolean;
	readonly charset: string;
	readonly corsExpose: string;
	readonly digit: number;
	readonly etags: {
		create: (input: string) => string;
		middleware: Function;
	} | null;
	readonly indexes: string[];
	readonly logging: {
		enabled: boolean;
		format: string;
		level: string;
	};
	readonly origins: Set<string>;
	readonly time: boolean;
	readonly logger: {
		log: (...args: any[]) => void;
		logError: (...args: any[]) => void;
		logRoute: (...args: any[]) => void;
		logMiddleware: (...args: any[]) => void;
		clf: (...args: any[]) => string;
		ms: (...args: any[]) => string;
		timeOffset: (...args: any[]) => string;
	};
	readonly fileServer: {
		register: (root: string, folder: string, use?: Function) => void;
		serve: (req: any, res: any, arg: string, folder?: string) => Promise<void>;
	};

	constructor(config?: WoodlandConfig);

	// Public routing methods
	always(...args: Function[]): Woodland;
	connect(...args: Function[]): Woodland;
	delete(...args: Function[]): Woodland;
	get(...args: Function[]): Woodland;
	options(...args: Function[]): Woodland;
	patch(...args: Function[]): Woodland;
	post(...args: Function[]): Woodland;
	put(...args: Function[]): Woodland;
	trace(...args: Function[]): Woodland;

	// Middleware methods
	ignore(fn: Function): Woodland;
	list(method?: string, type?: string): any | any[];
	use(rpath: string | Function, ...fn: Function[]): Woodland;

	// Utility methods
	etag(method: string, ...args: any[]): string;
	files(root?: string, folder?: string): Woodland;
	route(req: any, res: any): void;
	routes(uri: string, method: string, override?: boolean): RouteInfo;
	serve(req: any, res: any, arg: string, folder?: string): Promise<void>;
	stream(req: any, res: any, file?: FileDescriptor): void;

	// Deprecated/Internal methods (marked for internal use only)
	/** @deprecated Internal method - use routes() instead */
	allowed(method: string, uri: string, override?: boolean): boolean;
	/** @deprecated Internal method - use routes() instead */
	allows(uri: string, override?: boolean): string;
	/** @internal */
	decorate(req: any, res: any): void;
	/** @internal */
	onDone(req: any, res: any, body: any, headers: any): void;
	/** @internal */
	onReady(req: any, res: any, body: any, status: number, headers: any): any[];
	/** @internal */
	onSend(req: any, res: any, body: any, status: number, headers: any): any[];
}

export function woodland(arg?: WoodlandConfig): Woodland;

export default woodland;
