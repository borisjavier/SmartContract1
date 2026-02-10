/**
 * Ejecuta una función asíncrona con un sistema de reintentos limitado
 * diseñado específicamente para manejar errores de Rate Limit (429).
 */
export declare function withRetries<T>(fn: () => Promise<T>, maxAttempts?: number): Promise<T>;
