const { payEscrowContract } = require('./escrowContract/dist/payEscrowModule');
require('dotenv').config();

async function testPayEscrow(txId, participantKeys, atOutputIndex) {
    try {
        const payParams = {
            txId: txId,
            participantKeys: participantKeys,
            atOutputIndex: atOutputIndex || 0
        };

        const result = await payEscrowContract(payParams);
        
        return {
            txId: result.txId
        };
    } catch (error) {
        console.error('Error paying escrow contract:', error);
        throw new Error(`Escrow payment failed: ${error.message}`);
    }
}

// Parámetros de ejemplo (reemplaza con valores reales)
const DEPLOYED_CONTRACT_TXID = '5fefa1d15d364292954f38e3971c9eb7b5f6d76b4a9fb7134a329b465ee2f1b4'; // Reemplaza con el txid de tu contrato desplegado 
const PARTICIPANT_KEYS = [ 'KxgAsLj2Db5wanVL9bahW7ETAWm9ujyYouGxyR1p4MDPxpVvf6tY',
    'Kz3EyUNUNisjjXcKfNkRyvKFViM2tKrQzbE8qoXmmskJ2jawe5M8', 'L1jeCD1urUGLhK5EMv4zxwei2BaQJpQhWikAcP3m5ZWz6oDHdSyX', 
];
const AT_OUTPUT_INDEX = 0; // Índice de salida donde está el contrato

testPayEscrow(DEPLOYED_CONTRACT_TXID, PARTICIPANT_KEYS, AT_OUTPUT_INDEX)
    .then(result => {
        console.log('Escrow payment unlocked successfully!');
        console.log('Transaction ID:', result.txId);
    })
    .catch(error => {
        console.error('Test failed:', error);
    });