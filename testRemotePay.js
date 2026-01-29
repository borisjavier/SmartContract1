// Si usas una versión antigua de Node (pre-18), descomenta la siguiente línea:
// const fetch = require('node-fetch');

// URL de tu servicio desplegado
const SERVICE_URL = 'https://scrypt-service-1002383099812.us-central1.run.app/pay';

async function callRemotePay() {
    console.log("📡 Conectando con Cloud Run...");

    // 1. Preparamos los datos
    // Nota: index.js espera { size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey, purse }
    const payload = {
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

    try {
        // 2. Hacemos la llamada POST (equivalente a lo que hacía tu Cloud Function)
        const response = await fetch(SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 3. Procesamos la respuesta
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        console.log('✅ Éxito! Respuesta del servidor:');
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Error en la llamada remota:', error.message);
    }
}

// Ejecutar
callRemotePay();