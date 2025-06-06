const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { checkCache, restoreArtifacts, getDataPaymentsSize } = require('./utilities');
const { deployContract } = require('./payContract/deployModule');
const { adminPublicKey } = require('./payContract/config');
require('dotenv').config();


const contractDir = path.resolve(__dirname, './payContract');
const deployFileName = `deploy.ts`;
const deployPath = path.resolve(contractDir, deployFileName);
const resultFilePath = path.resolve(contractDir, 'deployResult.json').replace(/\\/g, '/');


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

    /**
     *  const result = {
                            contractId: deployTx.id,
                            state: contract.dataPayments,
                            addressOwner: realAddOwner,
                            addressGN: realAddGN,
                            paymentQuarks: contract.amountGN
                        };
     */
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

/*(async () => {
    try {
        const result = await createAndCompileAndDeploy(
            5000,              // Tokens
            60,                // Intervalo de tiempo entre transacciones
            1726598373,        // Fecha de inicio (timestamp)
            "02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db",  // Clave pública del dueño
            "02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc",  // Clave pública de la GN del dueño
            2125              // Quarks
        );
        console.log(result);
    } catch (error) {
        console.error('Error en el despliegue:', error);
    }
})();*/

 
    