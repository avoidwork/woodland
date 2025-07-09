import { IncomingMessage, ServerResponse } from "node:http";

export function autoindex(title?: string, files?: any[]): string;
export function getStatus(req: IncomingMessage, res: ServerResponse): number;
export function mime(arg?: string): string;
export function ms(arg?: number, digits?: number): string;
export function next(req: IncomingMessage, res: ServerResponse, middleware: Iterator<any>, immediate?: boolean): (err?: any) => void;
export function pad(arg?: number): string;
export function params(req: IncomingMessage, getParams: RegExp): void;
export function parse(arg: string | IncomingMessage): URL;
export function partialHeaders(req: IncomingMessage, res: ServerResponse, size: number, status: number, headers?: Record<string, any>, options?: Record<string, any>): [Record<string, any>, Record<string, any>];
export function pipeable(method: string, arg: any): boolean;
export function reduce(uri: string, map?: Map<any, any>, arg?: { middleware: any[], params: boolean, getParams?: RegExp }): void;
export function timeOffset(arg?: number): string;
export function writeHead(res: ServerResponse, headers?: Record<string, any>): void;
