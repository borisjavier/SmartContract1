const { refundEscrowContract } = require('./escrowContract/dist/refundEscrowModule');
require('dotenv').config();

async function testRefundEscrow(txId, deployerKeyType, participantKeys, atOutputIndex) {
    try {
        const refundParams = {
            txId: txId,
            deployerKeyType: deployerKeyType,
            participantKeys: participantKeys,
            atOutputIndex: atOutputIndex || 0
        };

        const result = await refundEscrowContract(refundParams);
        
        return {
            txId: result.txId,
            usedKeyType: result.usedKeyType
        };
    } catch (error) {
        console.error('Error refunding escrow contract:', error);
        throw new Error(`Escrow refund failed: ${error.message}`);
    }
}

// Parámetros de ejemplo (reemplaza con valores reales)
const DEPLOYED_CONTRACT_TXID = '67911d849e52338a0f58b34962837872b96eccad605e178d3b366325a4d26af1'; // Reemplaza con el txid de tu contrato desplegado
const DEPLOYER_KEY_TYPE = 'PRIVATE_KEY'; // o 'PRIVATE_KEY_2'
const PARTICIPANT_KEYS = [
    'KzZfDKPM4UVYk4aRD6gkw6hYFeB7yRtHUTzF5XKeJ8S1wWVWY7a4', 
    'Kwo4HeFPiABdcG3zc8oYt4DFi9SmSfyWJKrJFqfR3ryeVioDf48e', 
    'L2TXfUrNorr11W34ujZnvtRnvxyb1KwVSAMNSTKsQfbAbfwuUxLz'
];
const AT_OUTPUT_INDEX = 0; // Índice de salida donde está el contrato

testRefundEscrow(DEPLOYED_CONTRACT_TXID, DEPLOYER_KEY_TYPE, PARTICIPANT_KEYS, AT_OUTPUT_INDEX)
    .then(result => {
        console.log('Escrow refund successful!');
        console.log('Transaction ID:', result.txId);
        console.log('Key used for deployer:', result.usedKeyType);
    })
    .catch(error => {
        console.error('Test failed:', error);
    });