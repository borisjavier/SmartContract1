const { deployEscrowContract } = require('./escrowContract/dist/deployModule');
require('dotenv').config();

async function deployEscrow(publicKeys, lockTimeMin, contractPK) {
    try {
        const deployParams = {
            publicKeys: publicKeys,
            lockTimeMin: BigInt(lockTimeMin),
            contractPK: contractPK
        };

        const result = await deployEscrowContract(deployParams);
        
        return {
            txId: result.txId
        };
    } catch (error) {
        console.error('Error deploying escrow contract:', error);
        throw new Error(`Escrow deployment failed: ${error.message}`);
    }
}

//module.exports = deployEscrow;
const publicKeys = [
    '038e5022af542f137c6125a8aac70cac6ade4f20ebcd591d5b75567b2c7d7d69b1',
    '0349dbb90d3392b029b35567f087694328028e9e5f1188601da0c8b330d40ae64a',
    '03641f8c39e1ebae3f4a9589be7240edaf0bf788ed954058442606340b32bb0d49',
    '024b879cb0b0b96f73f0587fc083e5a1e7dee89f26f17cf25e4f1affefecc6ad1d'
];

const pk = 'L3ACtYZxJwMNs4h8pagNsC2B8t7iWB6Zk4Ffb2o65qYakkHdPmqb'
const lockTimeMin = 1762288037; // Timestamp Unix en segundos
//const amount = 100; // Satoshis a bloquear

deployEscrow(publicKeys, lockTimeMin, pk)
    .then(result => {
        console.log('Escrow deployed successfully!');
        console.log('Transaction ID:', result.txId);
    })
    .catch(error => {
        console.error('Deployment failed:', error);
    });