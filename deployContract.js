const { checkCache, restoreArtifacts, getDataPaymentsSize } = require('./utilities');
const { deployContract } = require('./payContract/deployModule');
const { adminPublicKey } = require('./payContract/config');
require('dotenv').config();



async function createDeploy(qtyT, lapse, startDate, ownerPubKey, ownerGNKey, quarks) {
   try {
    if (!process.env.PRIVATE_KEY) {
    throw new Error("La clave PRIVATE_KEY no está configurada en .env");
    }
    const deployParams = {
      qtyT: qtyT,
      lapse: lapse,
      startDate: startDate,
      ownerPub: ownerPubKey,
      ownerGN: ownerGNKey,
      quarks: quarks,
      adminPublicKey: adminPublicKey,
      privateKey: process.env.PRIVATE_KEY
    };

    const result = await deployContract(deployParams);
    
    return {
      contractId: result.contractId,
      state: result.state,
      addressOwner: result.addressOwner,
      addressGN: result.addressGN,
      paymentQuarks: result.paymentQuarks
    };
  } catch (error) {
    // Propagamos el error con información detallada
    const enhancedError = new Error(`Despliegue fallido: ${error.message}`);
    enhancedError.originalError = error;
    throw enhancedError;
  }

}

          async function prepareDeployment(size, tokens, lapso, start, pubOwner, pubGN, quarks) {
            try {
                const { tsSize, jsonSize, source } = await getDataPaymentsSize();
                 console.log(`Tamaño actual: TS=${tsSize}, JSON=${jsonSize || "N/A"}`);
                // Verificar si el tamaño actual es diferente del solicitado o si no hay datos almacenados
                if (tsSize !== size || (jsonSize && jsonSize !== size)) {
                    console.log(`Se requiere cambio de tamaño (${size})`);
                    const isCached = await checkCache(size);
                    if (!isCached) {
                        throw new Error(`No hay caché para tamaño ${size}`);
                    }
                    console.log(`Restaurando artifacts desde caché para size ${size}.`);
                    await restoreArtifacts(size);

                    // 3. Validación estricta post-restauración
                    const newSizes = await getDataPaymentsSize();
                    if (newSizes.tsSize !== size) {
                        throw new Error(
                            `Error crítico: Tamaño en TS (${newSizes.tsSize}) no coincide con ${size}`
                        );
                    }

                    if (newSizes.jsonSize && newSizes.jsonSize !== size) {
                        throw new Error(
                            `Error crítico: Tamaño en JSON (${newSizes.jsonSize}) no coincide con ${size}`
                        );
                    }
                }
        
                // Llamar a `createDeploy` para realizar el despliegue del contrato
                console.log('Llamando createDeploy...');
                const result = await createDeploy(tokens, lapso, start, pubOwner, pubGN, quarks);
                console.log('Contrato desplegado exitosamente.');
                return result;
        
            } catch (error) {
                throw new Error(`Error en el proceso: ${error.message}`);
            }
        }
        
        async function runDeploy(size, tokens, lapso, start, pubOwner, pubGN, quarks) {
            try {
                // Llamamos a `prepareDeployment` y esperamos el resultado
                const result = await prepareDeployment(size, tokens, lapso, start, pubOwner, pubGN, quarks);
        
                // Verificamos que el resultado sea válido
                if (result && typeof result === 'object' && result.contractId) {
                    console.log('Proceso completado exitosamente. Contrato desplegado:', JSON.stringify(result, null, 2));
                    return result;  // Retornar el resultado para su posterior uso
                } else {
                    throw new Error('La respuesta del despliegue no es válida o no contiene un contractId.');
                }
        
            } catch (error) {
                console.error('Error en el proceso de creación, compilación o despliegue:', error.message);
                throw error;  // Propagar el error para que sea manejado en niveles superiores
            }
        }
        

module.exports = runDeploy;
 
    