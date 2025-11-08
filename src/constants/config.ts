const PORT = process.env.PORT || 0;
const HOST = process.env.HOST || 'localhost';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const LU_ROOT = process.env.LU_ROOT || './lu-lang-py';

const BUILD_TIMEOUT = 30 * 1000; // 30s
const RUN_TIMEOUT = 2 * 60 * 1000; // 2min
const WS_TIMEOUT = 3 * 60 * 1000; // 3min

const RUN_MAX_MEMORY_MB = 50; // 50mb

const ISTREAM_MAX = 1 * 1024 * 1024; // 1mb
const OSTREAM_MAX = 1 * 1024 * 1024; // 1mb

const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10min
const RATE_LIMIT_WINDOW_MAX = 100;

export interface Config {
    port: number;
    host: string;
    frontendUrl: string;
    buildTimeout: number;
    runTimeout: number;
    runMaxMemoryMb: number;
    wsTimeout: number;
    istreamMax: number;
    ostreamMax: number;
    rateLimitWindow: number;
    rateLimitWindowMax: number;
    luRoot: string;
}

const DEV_CONFIG: Config = {
    port: parseInt(PORT as string),
    host: HOST,
    frontendUrl: FRONTEND_URL,
    buildTimeout: BUILD_TIMEOUT,
    runTimeout: RUN_TIMEOUT,
    wsTimeout: WS_TIMEOUT,
    runMaxMemoryMb: RUN_MAX_MEMORY_MB,
    istreamMax: ISTREAM_MAX,
    ostreamMax: OSTREAM_MAX,
    rateLimitWindow: RATE_LIMIT_WINDOW,
    rateLimitWindowMax: RATE_LIMIT_WINDOW_MAX,
    luRoot: LU_ROOT,
};

const PROD_CONFIG: Config = {
    port: parseInt(PORT as string),
    host: HOST,
    frontendUrl: FRONTEND_URL,
    buildTimeout: BUILD_TIMEOUT,
    runTimeout: RUN_TIMEOUT,
    wsTimeout: WS_TIMEOUT,
    runMaxMemoryMb: RUN_MAX_MEMORY_MB,
    istreamMax: ISTREAM_MAX,
    ostreamMax: OSTREAM_MAX,
    rateLimitWindow: RATE_LIMIT_WINDOW,
    rateLimitWindowMax: RATE_LIMIT_WINDOW_MAX,
    luRoot: LU_ROOT,
};

const CONFIG = process.env.NODE_ENV === 'production' ? PROD_CONFIG : DEV_CONFIG;

export default CONFIG;