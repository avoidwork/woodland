/// <reference types="node" />
export function autoindex(title?: string, files?: any[]): any;
export function clone(arg: any): any;
export function last(req: any, res: any, e: any, err: any): boolean;
export function ms(arg?: number, digits?: number): string;
export function next(req: any, res: any, e: any, middleware: any): (err: any) => void;
export function pad(arg?: number): string;
export function params(req: any, pos?: any[]): void;
export function parse(arg: any): URL;
export function partial(req: any, res: any, buffered: any, status: any, headers: any): void;
export function pipeable(method: any, arg: any): boolean;
export function reduce(uri: any, map?: Map<any, any>, arg?: {}, end?: boolean, ignore?: Set<any>): void;
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
export function writeHead(res: any, status: any, headers: any): void;
import { URL } from "url";
