const { refundEscrowContract } = require('./escrowContract/dist/refundEscrowModule');
require('dotenv').config();

async function testRefundEscrow(txId, participantKeys, atOutputIndex) {
    try {
        const refundParams = {
            txId: txId,
            participantKeys: participantKeys,
            atOutputIndex: atOutputIndex || 0
        };

        const result = await refundEscrowContract(refundParams);
        
        return {
            txId: result.txId
        };
    } catch (error) {
        console.error('Error refunding escrow contract:', error);
        throw new Error(`Escrow refund failed: ${error.message}`);
    }
}

// Parámetros de ejemplo (reemplazar con valores reales)
const DEPLOYED_CONTRACT_TXID = '4d592c84ddcf2e15239ed467ecf24cc3bef765042e9ab4bd7454bacd47a26eff'; //'aee5eb935252198e995034d52511df8455b9b7233794cea7460e7a9ae83e47bb' //'312e806637d55d2efee4d5ff9fc63764ae326dae456a082f164fbdb0bf7901e5'; // Reemplazar con el txid del contrato desplegado
const PARTICIPANT_KEYS = [ 'KxgAsLj2Db5wanVL9bahW7ETAWm9ujyYouGxyR1p4MDPxpVvf6tY',
    'Kz3EyUNUNisjjXcKfNkRyvKFViM2tKrQzbE8qoXmmskJ2jawe5M8', 'L1jeCD1urUGLhK5EMv4zxwei2BaQJpQhWikAcP3m5ZWz6oDHdSyX', 
];

const AT_OUTPUT_INDEX = 0; // Índice de salida donde está el contrato

testRefundEscrow(DEPLOYED_CONTRACT_TXID, PARTICIPANT_KEYS, AT_OUTPUT_INDEX)
    .then(result => {
        console.log('Escrow refund successful!');
        console.log('Transaction ID:', result.txId);
    })
    .catch(error => {
        console.error('Test failed:', error);
    });