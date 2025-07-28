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
    (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void): void;
}

export interface ErrorMiddlewareFunction {
    (err: any, req: IncomingMessage, res: ServerResponse, next: (err?: any) => void): void;
}

export interface ExtendedRequest extends IncomingMessage {
    allow?: string;
    body?: any;
    cors?: boolean;
    corsHost?: boolean;
    host?: string;
    ip?: string;
    params?: Record<string, any>;
    parsed?: URL;
    precise?: any;
    range?: { start: number; end: number };
    valid?: boolean;
    exit?: (err?: any) => void;
}

export interface ExtendedResponse extends ServerResponse {
    locals?: Record<string, any>;
    error?: (status: number, body?: any, headers?: Record<string, string>) => void;
    header?: (name: string, value: string) => void;
    json?: (body: any, status?: number, headers?: Record<string, string>) => void;
    redirect?: (url: string, permanent?: boolean) => void;
    send?: (body?: any, status?: number, headers?: Record<string, any>) => void;
    set?: (headers: Record<string, any> | Map<string, any> | Headers) => ServerResponse;
    status?: (code: number) => ServerResponse;
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
    clf(req: IncomingMessage, res: ServerResponse): string;
    cors(req: IncomingMessage): boolean;
    corsHost(req: IncomingMessage): boolean;
    decorate(req: IncomingMessage, res: ServerResponse): void;
    delete(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    error(req: IncomingMessage, res: ServerResponse): (status: number, body?: any, headers?: Record<string, string>) => void;
    etag(method: string, ino: number, size: number, mtime: number): string;
    files(root?: string, folder?: string): void;
    get(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    ignore(fn: Function): this;
    ip(req: IncomingMessage): string;
    json(res: ServerResponse): (arg: any, status?: number, headers?: Record<string, string>) => void;
    list(method?: string, type?: string): any;
    log(msg: string, level?: string): this;
    onDone(req: IncomingMessage, res: ServerResponse, body: any, headers: Record<string, any>): void;
    onReady(req: IncomingMessage, res: ServerResponse, body: any, status: number, headers: Record<string, any>): [Record<string, any>, Record<string, any>];
    onSend(req: IncomingMessage, res: ServerResponse, body: any, status: number, headers: Record<string, any>): [Record<string, any>, Record<string, any>];
    options(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    patch(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    path(arg?: string): string;
    post(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    put(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    redirect(res: ServerResponse): (uri: string, perm?: boolean) => void;
    requestSizeLimit(customLimit?: number): MiddlewareFunction;
    route(req: IncomingMessage, res: ServerResponse): void;
    routes(uri: string, method: string, override?: boolean): any;
    send(req: IncomingMessage, res: ServerResponse): (body?: any, status?: number, headers?: Record<string, any>) => void;
    set(res: ServerResponse): (arg?: Record<string, any> | Map<string, any> | Headers) => ServerResponse;
    serve(req: IncomingMessage, res: ServerResponse, arg: string, folder?: string): Promise<void>;
    status(res: ServerResponse): (arg?: number) => ServerResponse;
    stream(req: IncomingMessage, res: ServerResponse, file?: FileInfo): void;
    trace(...args: (string | MiddlewareFunction | ErrorMiddlewareFunction)[]): this;
    use(rpath: string | MiddlewareFunction, ...fn: (MiddlewareFunction | ErrorMiddlewareFunction | string)[]): this;
}

export function woodland(config?: WoodlandConfig): Woodland;
