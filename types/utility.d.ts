export function autoindex(title?: string, files?: any[]): any;
export function last(req: any, res: any, e: any, err: any): boolean;
export function ms(arg?: number, digits?: number): string;
export function next(req: any, res: any, e: any, middleware: any): (err: any) => any;
export function pad(arg?: number): any;
export function params(req: any, pos?: any[]): void;
export function parse(arg: any): any;
export function partialHeaders(req: any, res: any, size: any, status: any, headers?: {}, options?: {}): {}[];
export function pipeable(method: any, arg: any): boolean;
export function reduce(uri: any, map?: any, arg?: {}, end?: boolean, ignore?: any): void;
export function stream(req: any, res: any, file?: {
    charset: string;
    etag: string;
    path: string;
    stats: {
        mtime: Date;
        size: number;
    };
}): any;
export function timeOffset(arg?: number): string;
export function writeHead(res: any, status?: number, headers?: {}): void;
