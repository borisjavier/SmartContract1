const { refundEscrowContract } = require('./escrowContract/dist/refundEscrowModule');
require('dotenv').config();

async function testRefundEscrow(txId, participantKeys, atOutputIndex, contractPK) {
    try {
        const refundParams = {
            txId: txId,
            participantKeys: participantKeys,
            atOutputIndex: atOutputIndex || 0,
            contractPK: contractPK
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
const DEPLOYED_CONTRACT_TXID = 'c1e3dfa14307ac516d525986b3dda053531691bc262f0629ada79b836a02aa03'; //'aee5eb935252198e995034d52511df8455b9b7233794cea7460e7a9ae83e47bb' //'312e806637d55d2efee4d5ff9fc63764ae326dae456a082f164fbdb0bf7901e5'; // Reemplazar con el txid del contrato desplegado
const PARTICIPANT_KEYS = ['KxgAsLj2Db5wanVL9bahW7ETAWm9ujyYouGxyR1p4MDPxpVvf6tY','L4vVk66WtWXimu7oyMtRn5uWb8zStK7QMsUKW5awCBW617gLE7oW','L1jeCD1urUGLhK5EMv4zxwei2BaQJpQhWikAcP3m5ZWz6oDHdSyX']

const AT_OUTPUT_INDEX = 0; // Índice de salida donde está el contrato
const CONTRACT_PK = 'L3ACtYZxJwMNs4h8pagNsC2B8t7iWB6Zk4Ffb2o65qYakkHdPmqb';

testRefundEscrow(DEPLOYED_CONTRACT_TXID, PARTICIPANT_KEYS, AT_OUTPUT_INDEX, CONTRACT_PK)
    .then(result => {
        console.log('Escrow refund successful!');
        console.log('Transaction ID:', result.txId);
    })
    .catch(error => {
        console.error('Test failed:', error);
    });