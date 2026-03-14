import {
  ACCESS_CONTROL_ALLOW_CREDENTIALS,
  ACCESS_CONTROL_ALLOW_METHODS,
  ACCESS_CONTROL_ALLOW_HEADERS,
  ACCESS_CONTROL_EXPOSE_HEADERS,
  ACCESS_CONTROL_REQUEST_HEADERS,
  ACCESS_CONTROL_ALLOW_ORIGIN,
  ALLOW,
  EMPTY,
  OPTIONS,
  ORIGIN,
  TRUE,
  TIMING_ALLOW_ORIGIN,
  WILDCARD,
  X_CONTENT_TYPE_OPTIONS,
  NO_SNIFF,
} from "./constants.js";
import { parse as parseUrl } from "./utility.js";

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

export function isValidIP(ip) {
  if (!ip || typeof ip !== "string") {
    return false;
  }

  if (ip.indexOf(":") === -1) {
    const match = IPV4_PATTERN.exec(ip);

    if (!match) {
      return false;
    }

    for (let i = 1; i < 5; i++) {
      const num = parseInt(match[i], 10);
      if (num > 255) {
        return false;
      }
    }

    return true;
  }

  if (!IPV6_CHAR_PATTERN.test(ip)) {
    return false;
  }

  const ipv4MappedMatch = IPV4_MAPPED_PATTERN.exec(ip);
  if (ipv4MappedMatch) {
    return isValidIP(ipv4MappedMatch[1]);
  }

  if (ip === "::") {
    return true;
  }

  const doubleColonIndex = ip.indexOf("::");
  const isCompressed = doubleColonIndex !== -1;

  if (isCompressed) {
    if (ip.indexOf("::", doubleColonIndex + 2) !== -1) {
      return false;
    }

    const beforeDoubleColon = ip.substring(0, doubleColonIndex);
    const afterDoubleColon = ip.substring(doubleColonIndex + 2);

    const leftGroups = beforeDoubleColon ? beforeDoubleColon.split(":") : [];
    const rightGroups = afterDoubleColon ? afterDoubleColon.split(":") : [];

    const nonEmptyLeft = leftGroups.filter((g) => g !== "");
    const nonEmptyRight = rightGroups.filter((g) => g !== "");
    const totalGroups = nonEmptyLeft.length + nonEmptyRight.length;

    if (totalGroups >= 8) {
      return false;
    }

    for (let i = 0; i < nonEmptyLeft.length; i++) {
      if (!HEX_GROUP_PATTERN.test(nonEmptyLeft[i])) {
        return false;
      }
    }
    for (let i = 0; i < nonEmptyRight.length; i++) {
      if (!HEX_GROUP_PATTERN.test(nonEmptyRight[i])) {
        return false;
      }
    }

    return true;
  } else {
    const groups = ip.split(":");
    if (groups.length !== 8) {
      return false;
    }

    for (let i = 0; i < 8; i++) {
      if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
        return false;
      }
    }

    return true;
  }
}

export function createCorsHandler(origins) {
  function cors(req) {
    if (origins.length === 0) {
      return false;
    }

    return req.corsHost && (origins.includes(WILDCARD) || origins.includes(req.headers.origin));
  }

  function corsHost(req) {
    return (
      ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host
    );
  }

  function corsRequest() {
    return (req, res) => res.status(204).send(EMPTY);
  }

  return { cors, corsHost, corsRequest };
}

export function createIpExtractor() {
  function extract(req) {
    const connection = req.connection;
    const socket = req.socket;
    const fallbackIP =
      (connection && connection.remoteAddress) || (socket && socket.remoteAddress) || "127.0.0.1";

    const forwardedHeader = req.headers["x-forwarded-for"];
    if (!forwardedHeader || !forwardedHeader.trim()) {
      return fallbackIP;
    }

    const forwardedIPs = forwardedHeader.split(",");

    for (let i = 0; i < forwardedIPs.length; i++) {
      const ip = forwardedIPs[i].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }

    return fallbackIP;
  }

  return { extract };
}

export function createRequestDecorator({
  origins: _origins,
  time: _time,
  defaultHeaders,
  etags: _etags,
  corsExpose,
  getAllows,
  corsHostCheck,
  corsCheck,
  ipExtractor,
  logDecorator,
}) {
  function logClose(_req, _res) {
    // Placeholder for log close handler
  }

  function decorate(req, res, timing = null) {
    const parsed = parseUrl(req);
    const pathname = parsed.pathname;
    const allowString = getAllows(pathname);

    req.parsed = parsed;
    req.allow = allowString;
    req.body = EMPTY;
    req.host = parsed.hostname;
    req.params = {};
    req.valid = true;

    if (timing) {
      req.precise = timing;
    }

    req.corsHost = corsHostCheck(req);
    req.cors = corsCheck(req);

    const clientIP = ipExtractor(req);
    req.ip = clientIP;

    res.locals = {};

    const headersBatch = Object.create(null);
    headersBatch[ALLOW] = allowString;
    headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

    for (let i = 0; i < defaultHeaders.length; i++) {
      const [key, value] = defaultHeaders[i];
      headersBatch[key] = value;
    }

    if (req.cors) {
      const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? corsExpose;
      const origin = req.headers.origin;

      headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
      headersBatch[TIMING_ALLOW_ORIGIN] = origin;
      headersBatch[ACCESS_CONTROL_ALLOW_CREDENTIALS] = TRUE;
      headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = allowString;

      if (corsHeaders !== void 0) {
        headersBatch[
          req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS
        ] = corsHeaders;
      }
    }

    res.set(headersBatch);

    logDecorator(pathname, req.method, clientIP);
    res.on("close", () => logClose(req, res));
  }

  return { decorate, logClose };
}
