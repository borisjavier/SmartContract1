import { Escrowcontract, SIGS } from './src/contracts/escrowcontract'
import {
    bsv,
    TestWallet,
    Addr,
    FixedArray,
    hash160,
    PubKey
} from 'scrypt-ts'

import { GNProvider, UTXOWithHeight } from 'scrypt-ts/dist/providers/gn-provider';

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config();



function getPrivateKey(attempt: number): bsv.PrivateKey {
    if (attempt < 3) {
        // Primeros 3 intentos con PRIVATE_KEY
        if (!process.env.PRIVATE_KEY) {
            throw new Error("No \"PRIVATE_KEY\" found in .env")
        }
        return bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY)
    } else {
        // Cuarto intento con PRIVATE_KEY_2
        if (!process.env.PRIVATE_KEY_2) {
            throw new Error("No \"PRIVATE_KEY_2\" found in .env for final attempt")
        }
        return bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY_2)
    }
}

function getConfirmedUtxos(utxos: UTXOWithHeight[]): UTXOWithHeight[] {
    return utxos.filter(utxo => utxo.height >= 0);
}
const woc_api_key = process.env.WOC_API_KEY;
//const provider = new WhatsonchainProvider(bsv.Networks.mainnet);
const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key);


async function main() {
    await Escrowcontract.loadArtifact()

    // TODO: Adjust the amount of satoshis locked in the smart contract:
    const amount = 10;
    const lockTimeMin = 1748341000n;  //time of expiration or deadline of the contract in seconds, GN will be sent back

    // Claves públicas para el multisig
    const publicKeys: PubKey[] = [
        PubKey(bsv.PublicKey.fromString('038e5022af542f137c6125a8aac70cac6ade4f20ebcd591d5b75567b2c7d7d69b1').toHex()),
        PubKey(bsv.PublicKey.fromString('032adc904bbcba519b348b0c42ba2467002a793f1332cec64e8bf17e74ede035ee').toHex()),
        PubKey(bsv.PublicKey.fromString('031ec509d631e01c89435c2c0f5c524048d6b972c8b0f6d71c9ae5014e27c711bb').toHex()),
        PubKey(bsv.PublicKey.fromString('0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634').toHex())    
    ]

    //,
    //PubKey(bsv.PublicKey.fromString('0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634').toHex())
    const addresses: FixedArray<Addr, typeof SIGS> = publicKeys.map(pubKey => Addr(hash160(pubKey.toString()))) as FixedArray<Addr, typeof SIGS>
    console.log(addresses);

    const deployWithRetry = async (attempts = 4, delay = 3000): Promise<[string, string]> => {
       let lastError: Error | null = null
       for (let i = 0; i < attempts; i++) {
        try {
            const privateKey = getPrivateKey(i)
                const keyUsed = i < 3 ? 'PRIVATE_KEY' : 'PRIVATE_KEY_2'
                
                console.log(`Attempt ${i+1} using ${keyUsed}...`)
                
                const address = privateKey.toAddress(); //allPrivateKeys.map(pk => pk.toAddress());
                const allUtxos = await provider.listUnspent(address);
                const confirmedUtxos = getConfirmedUtxos(allUtxos);
                const signer = new TestWallet(
                    privateKey,
                    provider
                )

                if (confirmedUtxos.length === 0) {
                throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
                }
                    
                // Crear nueva instancia de contrato
                const timeLock = new Escrowcontract(addresses, lockTimeMin)
                await timeLock.connect(signer)
                
                // Intentar despliegue
                const deployTx = await timeLock.deploy(amount)
                
                // Retornar resultado con clave usada
                return [deployTx.id, keyUsed]
        } catch (error) {
            lastError = error
            console.error(`Attempt ${i+1} failed: ${error.message}`)
            if (error.message.includes('500') && 
                    error.message.includes('txn-mempool-conflict')) {
                        console.log(`Mempool conflict detected. Retrying in ${delay}ms...`)
                    } 
            if (i < attempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay))
                    
                    // Incrementar delay progresivamente
                    delay *= 2
                }
            }
        }
    throw lastError || new Error(`All deployment attempts failed`)
    } 

    try {
        const [txId, keyUsed] = await deployWithRetry()
        console.log(`\nEscrowcontract deployed successfully!`)
        console.log(`Transaction ID: ${txId}`)
        console.log(`Key used: ${keyUsed}\n`)
        
        return [txId, keyUsed]
    } catch (error) {
        console.error('\nFatal error during deployment:', error)
        throw error
    }
}

main()