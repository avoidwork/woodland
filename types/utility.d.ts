import { IncomingMessage, ServerResponse } from "node:http";

export interface FileEntry {
    name: string;
    isDirectory(): boolean;
}

export function autoindex(title?: string, files?: FileEntry[]): string;
export function getStatus(req: IncomingMessage, res: ServerResponse): number;
export function isSafeFilePath(filePath: string): boolean;
export function isValidHeaderValue(headerValue: string): boolean;
export function isValidIP(ip: string): boolean;
export function isValidOrigin(origin: string): boolean;
export function isValidPort(port: number): boolean;
export function mime(arg?: string): string;
export function ms(arg?: number, digits?: number): string;
export function next(req: IncomingMessage, res: ServerResponse, middleware: Iterator<Function>, immediate?: boolean): (err?: any) => void;
export function pad(arg?: number): string;
export function params(req: any, getParams: RegExp): void;
export function parse(arg: string | IncomingMessage): URL;
export function partialHeaders(req: IncomingMessage, res: ServerResponse, size: number, status: number, headers?: Record<string, any>, options?: Record<string, any>): [Record<string, any>, Record<string, any>];
export function pipeable(method: string, arg: any): boolean;
export function reduce(uri: string, map?: Map<string, any>, arg?: { middleware: Function[], params: boolean, getParams?: RegExp | null, visible?: number, exit?: number }): void;
export function sanitizeFilePath(filePath: string): string;
export function sanitizeHeaderValue(headerValue: string): string;
export function timeOffset(arg?: number): string;
export function writeHead(res: ServerResponse, headers?: Record<string, any>): void;
