const { dynamicImport } = require('./utilities');
const path = require('path');

const contractDir = path.resolve(__dirname, './payContract');
let payScriptFromModule = null;

async function createAndPay(lastStateTxid, txidPago, qtyT, ownerPubKey, purse, payScriptFunction) {
    try {
        // Mapeamos a BigInt en caso de que la función de TS los siga requiriendo en la firma,
        // aunque internamente el contrato lea desde la blockchain.

        const safeQtyTokens = qtyT !== undefined ? qtyT : 0;

        if(safeQtyTokens === 0) {
            console.warn('qtyT es indefinido o cero en este punto.');
        }
        //if(qtyT === 0) {console.warn('qty es indefinido en este punto.')}

        const paymentData = {
            txId: lastStateTxid,
            atOutputIndex: 0,
            txidPago,
            qtyTokens: safeQtyTokens,
            ownerPubKey,
            purse: purse
        };


        const result = await payScriptFunction(paymentData);
        console.log('Resultado del pago:', result);
        return result;
       
               
    } catch (error) {
        console.error(`Error en el proceso: ${error.message}`);
        throw error;
    }
}

    
    async function runPay(size, lastStateTxid, txidPago, qtyT, ownerPubKey, purse) {
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
                lastStateTxid, txidPago, qtyT, ownerPubKey, purse, payScriptFromModule
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