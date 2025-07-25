const { deployEscrowContract } = require('./escrowContract/dist/deployModule');
require('dotenv').config();

async function deployEscrow(publicKeys, lockTimeMin, amount) {
    try {
        const deployParams = {
            publicKeys: publicKeys,
            lockTimeMin: BigInt(lockTimeMin),
            amount: amount
        };

        const result = await deployEscrowContract(deployParams);
        
        return {
            txId: result.txId,
            keyUsed: result.keyUsed
        };
    } catch (error) {
        console.error('Error deploying escrow contract:', error);
        throw new Error(`Escrow deployment failed: ${error.message}`);
    }
}

//module.exports = deployEscrow;
const publicKeys = [
    '038e5022af542f137c6125a8aac70cac6ade4f20ebcd591d5b75567b2c7d7d69b1',
    '039705fb407ff766a169c926dd82a5809aa8f3c7f574e89af8249e977d7f53247b',
    '032adc904bbcba519b348b0c42ba2467002a793f1332cec64e8bf17e74ede035ee',
    '031ec509d631e01c89435c2c0f5c524048d6b972c8b0f6d71c9ae5014e27c711bb',
    '0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634'
];

const lockTimeMin = 1748341000; // Timestamp Unix en segundos
const amount = 100; // Satoshis a bloquear

deployEscrow(publicKeys, lockTimeMin, amount)
    .then(result => {
        console.log('Escrow deployed successfully!');
        console.log('Transaction ID:', result.txId);
        console.log('Key used:', result.keyUsed);
        console.log('Contract Address:', result.contractAddress);
    })
    .catch(error => {
        console.error('Deployment failed:', error);
    });