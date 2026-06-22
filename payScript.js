const { dynamicImport } = require('./utilities');
const path = require('path');

const contractDir = path.resolve(__dirname, './payContract');
let payScriptFromModule = null;

async function createAndPay(lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey, purse, payScriptFunction) {
    try {
        // Mapeamos a BigInt en caso de que la función de TS los siga requiriendo en la firma,
        // aunque internamente el contrato lea desde la blockchain.
        const bigIntArrayDatas = datas ? datas.map(num => BigInt(num).toString()) : [];
        //const bigIntArrayDatas = datas.map(num => `${num}`).join(', ');
        //const bigIntArrayDatas = datas.map(num => BigInt(num).toString());
        //const formattedTxids = JSON.stringify(txids)
        //const bigNumberQtyTokens = `${qtyT}`;
        const safeQtyTokens = qtyT !== undefined ? qtyT : 0;

        if(safeQtyTokens === 0) {
            console.warn('qtyT es indefinido o cero en este punto.');
        }
        //if(qtyT === 0) {console.warn('qty es indefinido en este punto.')}

        const paymentData = {
            txId: lastStateTxid,
            atOutputIndex: 0,
            datas: bigIntArrayDatas,//.map(b => b.toString())
            txids: txids,
            txidPago,
            qtyTokens: safeQtyTokens,
            ownerPubKey,
            purse: purse
        };

        /*
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

    
    async function runPay(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey, purse) {
        try {
            // 1. PATRÓN SINGLETON PARA LA CACHÉ EN MEMORIA
            if (!payScriptFromModule) {
                const finalPath = path.resolve(contractDir, 'dist', 'payScriptModule.js');
                console.log(`🔍 Cargando módulo de pago en memoria por primera vez desde: ${finalPath}`);

                const payScriptModule = await dynamicImport(finalPath);
                payScriptFromModule = payScriptModule.pay;

                if (!payScriptFromModule) {
                    throw new Error("No se pudo cargar la función 'pay' del módulo.");
                }
            } else {
                console.log('⚡ Módulo de pago recuperado instantáneamente desde la caché en memoria.');
            }

            // 2. EJECUTAR PAGO
            console.log('Llamando payScriptModule...');
            const result = await createAndPay(
                lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey, purse, payScriptFromModule
            );

            // 3. VALIDAR Y RETORNAR
            if (result && typeof result === 'object' && result.lastStateTxid) {
                console.log('✅ Pago registrado exitosamente en la blockchain.');
                return result;
            } else {
                throw new Error('La respuesta del llamado no es válida o no contiene lastStateTxid.');
            }
    
        } catch (error) {
            console.error(`Error en el proceso de pago: ${error.message}`);
            throw error;  // Propagamos el error para ser manejado en niveles superiores
        }
    }



module.exports = runPay;   