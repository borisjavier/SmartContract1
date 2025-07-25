import {
    Escrowcontract,
} from './src/contracts/escrowcontract'
import {
    bsv,
    findSigs,
    MethodCallOptions,
    PubKey,
    TestWallet
} from 'scrypt-ts'

import { GNProvider, UTXOWithHeight } from 'scrypt-ts/dist/providers/gn-provider';

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config();

function getConfirmedUtxos(utxos: UTXOWithHeight[]): UTXOWithHeight[] {
    return utxos.filter(utxo => utxo.height >= 0);
}
const woc_api_key = process.env.WOC_API_KEY;

const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key);



function sanitizePrivateKey(key: string | undefined): bsv.PrivateKey {
    if (!key) throw new Error("Private key is undefined")
    const cleanKey = key.replace(/["';\\\s]/g, '')
    try {
        return bsv.PrivateKey.fromWIF(cleanKey)
    } catch (error) {
        throw new Error(`Invalid private key format: ${cleanKey.substring(0, 6)}...`)
    }
}

const lockTime = Math.floor(Date.now() / 1000);

async function main(txId: string, 
    deployerKeyType: 'PRIVATE_KEY' | 'PRIVATE_KEY_2', 
    participantKeys: string[],
    atOutputIndex = 0) {
    await Escrowcontract.loadArtifact();
    
    const callWithRetry = async (attempt = 1): Promise<{txId: string, usedKeyType: string}> => {
        const maxAttempts = 4;
        try {
            const txResponse = await provider.getTransaction(txId);
            // Reconstruir la instancia del contrato desde la transacción existente
            const instance = Escrowcontract.fromTx(txResponse, atOutputIndex);
            const deployerPrivateKey = sanitizePrivateKey(process.env[deployerKeyType]);
                        if (!deployerPrivateKey) {
                            throw new Error(`Deployer key ${deployerKeyType} not found in .env ${atOutputIndex}`)
                        }
            const additionalKey = sanitizePrivateKey(process.env.PRIVATE_KEY_3);
            if (!additionalKey) {
                throw new Error("Additional key (PRIVATE_KEY_3) not found in .env");
            }
                        const participantPrivateKeys = participantKeys.map(wif => {
                            try {
                                return bsv.PrivateKey.fromWIF(wif)
                            } catch (error) {
                                throw new Error(`Invalid participant key: ${wif.substring(0, 6)}...`)
                            }
                        })
            
            let allPrivateKeys;
            //const allPrivateKeys = [deployerPrivateKey, ...participantPrivateKeys];
            if (deployerKeyType === "PRIVATE_KEY") {
                allPrivateKeys = [
                    deployerPrivateKey,   // PRIVATE_KEY (primera)
                    additionalKey,        // PRIVATE_KEY_3 (segunda)
                    ...participantPrivateKeys
                ];
            } else if (deployerKeyType === "PRIVATE_KEY_2") {
                allPrivateKeys = [
                    additionalKey,        // PRIVATE_KEY_3 (primera)
                    deployerPrivateKey,   // PRIVATE_KEY_2 (segunda)
                    ...participantPrivateKeys
                ];
            } else {
                throw new Error(`Tipo de clave de despliegue inválido: ${deployerKeyType}`);
            }
            const publicKeys = allPrivateKeys.map(pk => pk.publicKey);
            const address = deployerPrivateKey.toAddress();
            const allUtxos = await provider.listUnspent(address);
            const confirmedUtxos = getConfirmedUtxos(allUtxos);
            const signer = new TestWallet(allPrivateKeys, provider);

            if (confirmedUtxos.length === 0) {
            throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
            }
            await instance.connect(signer)
            const callContract = async () =>
            instance.methods.refundDeadline(
                (sigResps) => findSigs(sigResps, publicKeys),
                publicKeys.map((publicKey) => PubKey(publicKey.toByteString())),
                {
                    pubKeyOrAddrToSign: publicKeys,
                    lockTime: lockTime
                    
                } as MethodCallOptions<Escrowcontract>)
            const { tx: unlockTx } = await callContract();
            console.log(`Called "unlockAndTransfer". TxId: ${unlockTx.id}`);
            return {
                txId: unlockTx.id,
                usedKeyType: deployerKeyType
            }
            //console.log("Raw TX to broadcast:\n", unlockTx.toString());
                
        } catch (error) {
                console.error(`Attempt ${attempt} failed: ${error.message}`)
            
            // Manejar errores específicos
            if (error.message.includes('txn-mempool-conflict')) {
                console.log('Mempool conflict detected. Retrying...')
            } else if (error.message.includes('insufficient fee')) {
                console.log('Insufficient fee. Adjusting...')
            }
            
            // Reintentar después de delay
            if (attempt < maxAttempts) {
                const delay = 3000 * Math.pow(2, attempt - 1)
                console.log(`Retrying in ${delay}ms...`)
                await new Promise(resolve => setTimeout(resolve, delay))
                return callWithRetry(attempt + 1)
            } else {
                throw new Error(`All call attempts failed: ${error.message}`)
            }
        } 
    }

    return callWithRetry();    
}

const participantKeys = [
    'KzZfDKPM4UVYk4aRD6gkw6hYFeB7yRtHUTzF5XKeJ8S1wWVWY7a4', 'Kwo4HeFPiABdcG3zc8oYt4DFi9SmSfyWJKrJFqfR3ryeVioDf48e', 'L2TXfUrNorr11W34ujZnvtRnvxyb1KwVSAMNSTKsQfbAbfwuUxLz'
]
main('351191900c96970fa2cdcad6a3fef5897d57b1e4da1b00f0bfc7dc5e10d4c951', 'PRIVATE_KEY', participantKeys);