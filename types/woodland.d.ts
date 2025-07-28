import { IncomingMessage, ServerResponse } from "node:http";
import { EventEmitter } from "node:events";
import { LRU } from "tiny-lru";

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
    logging?: {
        enabled?: boolean;
        format?: string;
        level?: string;
    };
    maxHeader?: {
        enabled?: boolean;
        byteSize?: number;
    };
    maxUpload?: {
        enabled?: boolean;
        byteSize?: number;
    };
    origins?: string[];
    silent?: boolean;
    time?: boolean;
}

export interface FileInfo {
    charset: string;
    etag: string;
    path: string;
    stats: {
        mtime: Date;
        size: number;
        ino?: number;
        mtimeMs?: number;
    };
}

export interface MiddlewareFunction {
    (req: ExtendedRequest, res: ExtendedResponse, next: (err?: any) => void): void;
}

export interface ErrorMiddlewareFunction {
    (err: any, req: ExtendedRequest, res: ExtendedResponse, next: (err?: any) => void): void;
}

export interface ExtendedRequest extends IncomingMessage {
    allow: string;
    body: any;
    cors: boolean;
    corsHost: boolean;
    host: string;
    ip: string;
    params: Record<string, any>;
    parsed: URL;
    precise?: any;
    range?: { start: number; end: number };
    valid: boolean;
    exit?: (err?: any) => void;
}

export interface ExtendedResponse extends ServerResponse {
    locals: Record<string, any>;
    error: (status?: number, body?: any) => void;
    header: (name: string, value: string) => void;
    json: (body: any, status?: number, headers?: Record<string, string>) => void;
    redirect: (url: string, permanent?: boolean) => void;
    send: (body?: any, status?: number, headers?: Record<string, any>) => void;
    set: (headers: Record<string, any> | Map<string, any> | Headers) => ServerResponse;
    status: (code: number) => ServerResponse;
}

export interface RouteInfo {
    getParams: RegExp | null;
    middleware: Function[];
    params: boolean;
    visible: number;
    exit: number;
}

export class Woodland extends EventEmitter {
    constructor(config?: WoodlandConfig);
    
    autoindex: boolean;
    ignored: Set<Function>;
    cache: LRU<any>;
    charset: string;
    corsExpose: string;
    defaultHeaders: [string, string][];
    digit: number;
    etags: any;
    indexes: string[];
    permissions: LRU<any>;
    logging: {
        enabled: boolean;
        format: string;
        level: string;
    };
    maxHeader: {
        enabled: boolean;
        byteSize: number;
    };
    maxUpload: {
        enabled: boolean;
        byteSize: number;
    };
    methods: string[];
    middleware: Map<string, Map<string, any>>;
    origins: string[];
    time: boolean;
    
    allowed(method: string, uri: string, override?: boolean): boolean;
    allows(uri: string, override?: boolean): string;
    always(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    connect(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    clf(req: ExtendedRequest, res: ExtendedResponse): string;
    cors(req: ExtendedRequest): boolean;
    corsHost(req: ExtendedRequest): boolean;
    decorate(req: IncomingMessage, res: ServerResponse): void;
    delete(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    error(req: ExtendedRequest, res: ExtendedResponse): (status?: number, body?: any) => void;
    etag(method: string, ...args: any[]): string;
    files(root?: string, folder?: string): void;
    get(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    ignore(fn: Function): this;
    ip(req: IncomingMessage): string;
    json(res: ExtendedResponse): (arg: any, status?: number, headers?: Record<string, string>) => void;
    list(method?: string, type?: string): string[] | Record<string, any>;
    log(msg: string, level?: string): this;
    onDone(req: ExtendedRequest, res: ExtendedResponse, body: any, headers: Record<string, any>): void;
    onReady(req: ExtendedRequest, res: ExtendedResponse, body: any, status: number, headers: Record<string, any>): [any, number, Record<string, any>];
    onSend(req: ExtendedRequest, res: ExtendedResponse, body: any, status: number, headers: Record<string, any>): [any, number, Record<string, any>];
    options(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    patch(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    path(arg?: string): string;
    post(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    put(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    redirect(res: ExtendedResponse): (uri: string, perm?: boolean) => void;
    requestSizeLimit(): MiddlewareFunction;
    route(req: IncomingMessage, res: ServerResponse): void;
    routes(uri: string, method: string, override?: boolean): RouteInfo;
    send(req: ExtendedRequest, res: ExtendedResponse): (body?: any, status?: number, headers?: Record<string, any>) => void;
    set(res: ExtendedResponse): (arg?: Record<string, any> | Map<string, any> | Headers) => ServerResponse;
    serve(req: ExtendedRequest, res: ExtendedResponse, arg: string, folder?: string): Promise<void>;
    status(res: ExtendedResponse): (arg?: number) => ServerResponse;
    stream(req: ExtendedRequest, res: ExtendedResponse, file?: FileInfo): void;
    trace(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    use(rpath: string | MiddlewareFunction, ...fn: (MiddlewareFunction | ErrorMiddlewareFunction | string)[]): this;
}

export function woodland(config?: WoodlandConfig): Woodland;
