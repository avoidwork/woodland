import { EventEmitter } from "node:events";

export interface WoodlandConfig {
	autoindex?: boolean;
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
}

export class Woodland extends EventEmitter {
	autoindex: boolean;
	charset: string;
	corsExpose: string;
	defaultHeaders: [string, string][];
	digit: number;
	etags: {
		create: (input: string) => string;
		middleware: Function;
	} | null;
	indexes: string[];
	logging: {
		enabled: boolean;
		format: string;
		level: string;
	};
	origins: Set<string>;
	time: boolean;
	cache: Map<any, any>;
	permissions: Map<string, string>;
	methods: string[];
	logger: {
		log: (...args: any[]) => void;
		logError: (...args: any[]) => void;
		logRoute: (...args: any[]) => void;
		clf: (...args: any[]) => string;
	};
	fileServer: {
		register: (root: string, folder: string, use: Function) => void;
		serve: (req: any, res: any, arg: string, folder: string) => Promise<void>;
	};
	middleware: {
		ignore: (fn: Function) => void;
		allowed: (method: string, uri: string, override?: boolean) => boolean;
		routes: (uri: string, method: string, override?: boolean) => RouteInfo;
		register: (path: string, ...fns: Function[]) => void;
		list: (method: string, type: string) => any;
	};

	constructor(config?: WoodlandConfig);

	allowed(method: string, uri: string, override?: boolean): boolean;
	allows(uri: string, override?: boolean): string;
	always(...args: Function[]): Woodland;
	connect(...args: Function[]): Woodland;
	decorate(req: any, res: any): void;
	delete(...args: Function[]): Woodland;
	etag(method: string, ...args: any[]): string;
	files(root?: string, folder?: string): void;
	get(...args: Function[]): Woodland;
	ignore(fn: Function): Woodland;
	list(method?: string, type?: string): any | any[];
	onDone(req: any, res: any, body: any, headers: any): void;
	onReady(req: any, res: any, body: any, status: number, headers: any): any[];
	onSend(req: any, res: any, body: any, status: number, headers: any): any[];
	options(...args: Function[]): Woodland;
	patch(...args: Function[]): Woodland;
	post(...args: Function[]): Woodland;
	put(...args: Function[]): Woodland;
	route(req: any, res: any): void;
	routes(uri: string, method: string, override?: boolean): RouteInfo;
	serve(req: any, res: any, arg: string, folder?: string): Promise<void>;
	stream(req: any, res: any, file?: FileDescriptor): void;
	trace(...args: Function[]): Woodland;
	use(rpath: string | Function, ...fn: Function[]): Woodland;
}

export function woodland(arg?: WoodlandConfig): Woodland;

export default woodland;
