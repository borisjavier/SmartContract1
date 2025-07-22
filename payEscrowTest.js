const { payEscrowContract } = require('./escrowContract/dist/payEscrowModule');
require('dotenv').config();

async function testPayEscrow(txId, deployerKeyType, participantKeys, atOutputIndex) {
    try {
        const payParams = {
            txId: txId,
            deployerKeyType: deployerKeyType,
            participantKeys: participantKeys,
            atOutputIndex: atOutputIndex || 0
        };

        const result = await payEscrowContract(payParams);
        
        return {
            txId: result.txId,
            usedKeyType: result.usedKeyType
        };
    } catch (error) {
        console.error('Error paying escrow contract:', error);
        throw new Error(`Escrow payment failed: ${error.message}`);
    }
}

// Parámetros de ejemplo (reemplaza con valores reales)
const DEPLOYED_CONTRACT_TXID = '38ad62b0d270a42f79ce7d7e447b72a141ce17a5b42d1d6b200bed92d7221bb3'; // Reemplaza con el txid de tu contrato desplegado
const DEPLOYER_KEY_TYPE = 'PRIVATE_KEY'; 
const PARTICIPANT_KEYS = [
    'KzZfDKPM4UVYk4aRD6gkw6hYFeB7yRtHUTzF5XKeJ8S1wWVWY7a4', 
    'KynAzcDwiWvfSLGWF8peu3qhj5nLWsKFKXzqSck62vsXw5i8kuTe', 
    'L2TXfUrNorr11W34ujZnvtRnvxyb1KwVSAMNSTKsQfbAbfwuUxLz'
];
const AT_OUTPUT_INDEX = 0; // Índice de salida donde está el contrato

testPayEscrow(DEPLOYED_CONTRACT_TXID, DEPLOYER_KEY_TYPE, PARTICIPANT_KEYS, AT_OUTPUT_INDEX)
    .then(result => {
        console.log('Escrow payment unlocked successfully!');
        console.log('Transaction ID:', result.txId);
        console.log('Key used for deployer:', result.usedKeyType);
    })
    .catch(error => {
        console.error('Test failed:', error);
    });