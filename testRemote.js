const serviceBase = 'https://scrypt-service-1002383099812.us-central1.run.app';

const URL_MAP = { // 
  deploy: `${serviceBase}/gen-contract`,
  pay: `${serviceBase}/pay`,
  transfer: `${serviceBase}/transfer`,
  escrowDeploy: `${serviceBase}/depEscrow`,
  escrowPay: `${serviceBase}/payEsc`,
  escrowRefund: `${serviceBase}/callRefund`
};

const theKey = 'KxzLan4yAWPwUUj1TzhT7BPwq1V7TSMqrovMfJNVarv7BJjCeaCt'; // Asegúrate de poner la llave del purse

    // Mapeo de parámetros según lo que espera tu servidor (index.js)
    const payloadDeploy = {
        size: 8,                    // n -> size
        tokens: 100,                // qtyT -> tokens
        lapso: 300,                 // lapse -> lapso
        start: Math.floor(Date.now() / 1000), // startDate -> start
        pubOwner: '0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634',
        pubGN: '036d37bf32c8c444614ce9c354d0a4b2886a6506317ee9d7f50383f9520f610d2b',
        quarks: 5000,
        purse: theKey
    };

    const payloadPay = {
        size: 8, // El tamaño del arreglo datas (según tu ejemplo son 8 elementos)
        
        lastStateTxid: '8a71710339db8173425a0b4767093b52e08d348a6d02ac2d534e087e1f2b2780',
        
        // Enviamos como Strings para asegurar precisión, el backend lo convierte a BigInt
        datas: [
            "1769616614", "1769617505", "1769618074", "1769624789", 
            "1769634138", "1769634258", "1769635011", "1769580020"
        ],
        
        txids: [
            'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'
        ],
        
        txidPago: 'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
        
        qtyT: 100, // IMPORTANTE: En tu index.js definiste esto como 'qtyT', no 'qtyTokens'
        
        ownerPubKey: '0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634',
        
        purse: 'KxzLan4yAWPwUUj1TzhT7BPwq1V7TSMqrovMfJNVarv7BJjCeaCt'
    };

async function callRemoteDeploy(service, payload) {
    console.log("🚀 Iniciando despliegue remoto en Cloud Run...");

    

    try {
        const response = await fetch(URL_MAP[service], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        // Formateamos la salida para que sea idéntica a tu deployContractTest.js
        const resultArr = {
            contractId: result.contractId,
            state: result.state,
            addressOwner: result.addressOwner,
            addressGN: result.addressGN,
            paymentQuarks: result.paymentQuarks
        };

        console.log('✅ Despliegue exitoso:');
        console.log(resultArr);
        return resultArr;

    } catch (error) {
        console.error('❌ Error en el despliegue remoto:', error.message);
    }
}

callRemoteDeploy('deploy', payloadDeploy);