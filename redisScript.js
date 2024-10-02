const Redis = require('ioredis');
const redis = new Redis();  // Se conecta a Redis

// Función para adquirir un lock
async function acquireLock(size) {
  const lockKey = `contract:${size}:lock`;  // Clave del lock en Redis
  const lockTTL = 60 * 1000;  // Tiempo de vida del lock en milisegundos (1 minuto)

  // Intenta crear el lock solo si no existe (NX: set si no existe, PX: expira después de TTL)
  const lockAcquired = await redis.set(lockKey, 'locked', 'NX', 'PX', lockTTL);

  return lockAcquired !== null;  // Retorna true si el lock fue adquirido, false si ya existe
}

// Función para liberar un lock
async function releaseLock(size) {
  const lockKey = `contract:${size}:lock`;
  await redis.del(lockKey);  // Elimina el lock en Redis
}

// Función principal para manejar el flujo de contrato con locks distribuidos
async function processContract(size, task) {
  const lockAcquired = await acquireLock(size);

  if (!lockAcquired) {
    console.log(`Otro proceso está compilando un contrato del tamaño ${size}. Esperando...`);
    return;  // Si no se puede adquirir el lock, salimos
  }

  try {
    console.log(`Compilación y despliegue del contrato tamaño ${size} en proceso...`);
    await task();  // Ejecutar la tarea
  } finally {
    await releaseLock(size);  // Liberar el lock cuando la tarea termine
    console.log(`Contrato tamaño ${size} procesado. Lock liberado.`);
  }
}

module.exports = processContract;

// Ejemplo de uso:
/*processContract(5, async () => {
  await createCompileAndDeploy(5, 5000, 60, 1726598373, 'pubKeyAlice', 'pubKeyGN', 2125);
});

processContract(10, async () => {
  await createCompileAndDeploy(10, 3000, 30, 1726598888, 'pubKeyBob', 'pubKeyGN', 1500);
});*/
