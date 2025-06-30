const { checkCache, clearContractCache, dynamicImport, restoreArtifacts, getDataPaymentsSize } = require('./utilities');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const contractDir = path.resolve(__dirname, './payContract');

async function createAndPay(lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey, payScriptFunction) {
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

        /*Es bárbaro
        const paymentData = {
            txId: '705a50853697092fecd4ce7a9a4eccd24eca06e0092d72221d8f1cf8538dbaa9',
            atOutputIndex: 0,
            datas: [1750721340, 1750719766, 1750720066, 1750720366].map(b => b.toString()), //
            txids: [
                'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
                '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836',
                '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836',
                '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'
            ],
            txidPago: 'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            qtyTokens: 100,
            ownerPubKey: '0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634'
        };*/

        const result = await payScriptFunction(paymentData);
        console.log('Resultado del pago:', result);
        return result;
       
               
    } catch (error) {
        console.error(`Error en el proceso: ${error.message}`);
        throw error;
    }
}

let payScriptFromModule = null;


      async function createPayScriptAndCall(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey) {
        try {
            const { tsSize, jsonSize, source } = await getDataPaymentsSize();
            console.log(`Tamaño actual: TS=${tsSize}, JSON=${jsonSize || "N/A"}`);
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

                    /*// 🔄 Limpiar caché de módulos después de restaurar
                    Object.keys(require.cache).forEach(key => {
                        if (key.includes('paycontract') || key.includes('deployModule')) {
                            delete require.cache[key];
                        }
                    });*/

                    // 🔄 RECOMPILAR EL CONTRATO
                    //console.log('Compilando contrato con tsc...');
                    //await compileContract();
                    await clearContractCache();
                    console.log(`✅ Artefactos restaurados y caché limpiada para size ${size}`);

                    
                    const payScriptModule = await dynamicImport(
                        path.resolve(contractDir, 'dist', 'payScriptModule.js')
                    );

                    payScriptFromModule = payScriptModule.pay;
                }
    
            // Llamar a `createAndPay` para ejecutar el script de pago
            console.log('Llamando payScriptModule...');//lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey
            const result = await createAndPay(lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey, payScriptFromModule);
            console.log('Pago registrado exitosamente.');
            return result;
    
        } catch (error) {
            throw new Error(`Error en payScript [Runservice]: ${error.message}`);
        }
    }

    async function compileContract() {
                try {
                    const { stdout, stderr } = await execPromise('npx tsc', {
                        cwd: path.resolve(__dirname, 'payContract') // Directorio del contrato
                    });
                    
                    console.log('✅ Compilación exitosa');
                    console.log(stdout);
                    
                    if (stderr) {
                        console.warn('⚠️ Advertencias de compilación:', stderr);
                    }
                    
                    // Verificar que los archivos JS se generaron
                    const jsFiles = fs.readdirSync(path.resolve(__dirname, 'payContract/dist'));
                    if (!jsFiles.length) {
                        throw new Error('No se generaron archivos JS en la compilación');
                    }
                    
                } catch (error) {
                    console.error('❌ Error en la compilación:', error);
                    throw new Error(`Falló la compilación: ${error.stderr || error.message}`);
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