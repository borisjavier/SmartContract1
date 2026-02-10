/**
 * Ejecuta una función asíncrona con un sistema de reintentos limitado
 * diseñado específicamente para manejar errores de Rate Limit (429).
 */
export async function withRetries<T>(
    fn: () => Promise<T>, 
    maxAttempts: number = 3
): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(); 
        } catch (error: unknown) { 
            
            // Extrae el mensaje de forma segura
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            const isRateLimit = 
                errorMessage.includes('429') || 
                errorMessage.toLowerCase().includes('too many requests');
            
            // Si NO es error de cuota o ya agotamos intentos, lanzamos el error original
            if (!isRateLimit || attempt === maxAttempts) {
                throw error;
            }

            const waitTime = attempt * 2000; 
            console.warn(`⚠️ [Network] Intento ${attempt}/${maxAttempts} fallido (Rate Limit). Reintentando en ${waitTime}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    throw new Error("Fallo tras agotar todos los reintentos.");
}