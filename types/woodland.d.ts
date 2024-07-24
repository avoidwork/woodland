export function woodland(arg: any): Woodland;
export class Woodland {
    constructor({ autoindex, cacheSize, cacheTTL, charset, defaultHeaders, digit, etags, indexes, logging, origins, silent, time }?: {
        autoindex?: boolean;
        cacheSize?: number;
        cacheTTL?: number;
        charset?: string;
        defaultHeaders?: {};
        digit?: number;
        etags?: boolean;
        indexes?: string[];
        logging?: {};
        origins?: string[];
        silent?: boolean;
        time?: boolean;
    });
    autoindex: boolean;
    ignored: any;
    cache: import("tiny-lru").LRU<any>;
    charset: string;
    corsExpose: string;
    defaultHeaders: any;
    digit: number;
    etags: {
        cache: import("tiny-lru").LRU<any>;
        mimetype: any;
        seed: any;
        create(arg: any): string;
        middleware(req: any, res: any, next: any): void;
        hash(arg?: string, mimetype?: string): string;
        register(key: any, arg: any): any;
        unregister(key: any): void;
        valid(headers: any): boolean;
    };
    indexes: string[];
    permissions: import("tiny-lru").LRU<any>;
    logging: {
        enabled: boolean;
        format: any;
        level: any;
    };
    methods: any[];
    middleware: any;
    origins: string[];
    time: boolean;
    allowed(method: any, uri: any, override?: boolean): boolean;
    allows(uri: any, override?: boolean): any;
    always(...args: any[]): this;
    connect(...args: any[]): this;
    clf(req: any, res: any): any;
    cors(req: any): any;
    corsHost(req: any): boolean;
    decorate(req: any, res: any): void;
    del(...args: any[]): this;
    delete(...args: any[]): this;
    error(req: any, res: any): (status: number, body: any) => void;
    etag(method: any, ...args: any[]): string;
    get(...args: any[]): this;
    ignore(fn: any): this;
    ip(req: any): any;
    json(res: any): (arg: any, status?: number, headers?: {
        "content-type": string;
    }) => void;
    list(method?: string, type?: string): any;
    log(msg: any, level?: string): this;
    ondone(req: any, res: any, body: any, headers: any): void;
    onready(req: any, res: any, body: any, status: any, headers: any): any[];
    onsend(req: any, res: any, body: any, status: any, headers: any): any[];
    options(...args: any[]): this;
    patch(...args: any[]): this;
    path(arg?: string): string;
    post(...args: any[]): this;
    put(...args: any[]): this;
    redirect(res: any): (uri: any, perm?: boolean) => void;
    route(req: any, res: any): void;
    routes(uri: any, method: any, override?: boolean): any;
    send(req: any, res: any): (body?: string, status?: any, headers?: {}) => void;
    set(res: any): (arg?: {}) => any;
    serve(req: any, res: any, arg: string, folder?: string): Promise<void>;
    status(res: any): (arg?: number) => any;
    staticFiles(root: string, folder?: string): void;
    trace(...args: any[]): this;
    use(rpath: any, ...fn: any[]): this;
}
