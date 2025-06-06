const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { checkCache, restoreArtifacts, getDataPaymentsSize } = require('./utilities');
const { Mutex } = require('async-mutex');
const mutex = new Mutex();
const { executePayment } = require('./payContract/payScriptModule');


async function createAndPay(lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey) {
    try {

        const bigIntArrayDatas = datas.map(num => `${num}`).join(', ');
        const formattedTxids = JSON.stringify(txids);
        const bigNumberQtyTokens = `${qtyT}`;

        const paymentData = {
            txId: lastStateTxid,
            atOutputIndex: 0,
            datas: bigIntArrayDatas.map(b => b.toString()),//
            txids: formattedTxids,
            txidPago,
            qtyTokens: bigNumberQtyTokens,
            ownerPubKey
        };


        const result = await executePayment(paymentData);
        console.log('Resultado del pago:', result);
        return result;
       
               
    } catch (error) {
        console.error(`Error en el proceso: ${error.message}`);
        throw error;
    }
}


      async function createPayScriptAndCall(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey) {
        try {
            const { tsSize, jsonSize, source } = await getDataPaymentsSize();
            console.log(`Tamaño actual: TS=${tsSize}, JSON=${jsonSize || "N/A"}`);
            if (tsSize !== size || jsonSize == null)  {
                console.log(`Se requiere cambio de tamaño para payScript de ${tsSize} a (${size})`);
                const isCached = await checkCache(size);
                if (!isCached) {
                throw new Error(`No hay caché para tamaño ${size}`);
                }
                console.log(`Restaurando artifacts para payScript. Tamaño: ${size}...`);
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
    
            // Llamar a `createAndPay` para ejecutar el script de pago
            console.log('Llamando payScriptModule...');//lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey
            const result = await createAndPay(lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey);
            console.log('Pago registrado exitosamente.');
            return result;
    
        } catch (error) {
            throw new Error(`Error en payScript [Runservice]: ${error.message}`);
        }
    }
    
    async function runPay(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey) {
        try {
            // Llamar a `createPayScriptAndCall` y esperar el resultado
            const result = await createPayScriptAndCall(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey);
    
            // Verificar que el resultado sea válido
            if (result && typeof result === 'object' && result.lastStateTxid) {
                console.log('Proceso completado exitosamente. Pago efectuado:', JSON.stringify(result, null, 2));
                return result;  // Retorna el resultado para su posterior uso
            } else {
                throw new Error('La respuesta del llamado no es válida o no contiene lastStateTxid.');
            }
    
        } catch (error) {
            console.error('Error en el proceso de creación o llamado:', error.message);
            throw error;  // Propagamos el error para ser manejado en niveles superiores
        }
    }



module.exports = runPay;   