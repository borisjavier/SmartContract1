// const fetch = require('node-fetch'); // Descomentar si usas Node < 18

const SERVICE_URL = 'https://scrypt-service-1002383099812.us-central1.run.app/gen-contract';

async function callRemoteDeploy() {
    console.log("🚀 Iniciando despliegue remoto en Cloud Run...");

    const theKey = 'TU_PRIVATE_KEY_WIF_AQUÍ'; // Asegúrate de poner la llave del purse

    // Mapeo de parámetros según lo que espera tu servidor (index.js)
    const payload = {
        size: 8,                    // n -> size
        tokens: 100,                // qtyT -> tokens
        lapso: 300,                 // lapse -> lapso
        start: Math.floor(Date.now() / 1000), // startDate -> start
        pubOwner: '0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634',
        pubGN: '036d37bf32c8c444614ce9c354d0a4b2886a6506317ee9d7f50383f9520f610d2b',
        quarks: 5000,
        purse: 'KxzLan4yAWPwUUj1TzhT7BPwq1V7TSMqrovMfJNVarv7BJjCeaCt'
    };

    try {
        const response = await fetch(SERVICE_URL, {
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

callRemoteDeploy();