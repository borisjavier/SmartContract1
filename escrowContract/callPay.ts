import { Escrowcontract } from './src/contracts/escrowcontract'
import {
    bsv,
    findSigs,
    MethodCallOptions,
    PubKey,
    TestWallet,
    SignatureResponse,
    UTXO
} from 'scrypt-ts'

import {
    GNProvider
} from 'scrypt-ts/dist/providers/gn-provider'

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config()

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos;
}
const woc_api_key = process.env.WOC_API_KEY
if (!woc_api_key) {
    throw new Error('No "WOC_API_KEY" found in .env file')
}

const network = bsv.Networks.mainnet
const provider = new GNProvider(network, woc_api_key)
const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '')

/*function sanitizePrivateKey(key: string | undefined): bsv.PrivateKey {
    if (!key) throw new Error("Private key is undefined")
    const cleanKey = key.replace(/["';\\\s]/g, '')
    try {
        return bsv.PrivateKey.fromWIF(cleanKey)
    } catch (error) {
        throw new Error(`Invalid private key format: ${cleanKey.substring(0, 6)}...`)
    }
}*/

async function main(
    txId: string,
    participantKeys: string[],
    atOutputIndex = 0
) {
    await Escrowcontract.loadArtifact()

    const callWithRetry = async (
        attempt = 1,
        delay = 3000
    ): Promise<{ txId: string }> => {
        const maxAttempts = 4

        for (
            let attemptCount = attempt;
            attemptCount <= maxAttempts;
            attemptCount++
        ) {
            try {
                console.log(`Call attempt ${attemptCount}...`)
                const txResponse = await provider.getTransaction(txId)
                // Reconstruir la instancia del contrato desde la transacción existente
                const instance = Escrowcontract.fromTx(
                    txResponse,
                    atOutputIndex
                )

                //const privateKey = sanitizePrivateKey(privateKey);
                if (!privateKey) {
                    throw new Error(
                        `Deployer key ${privateKey} not found in .env ${atOutputIndex}`
                    )
                }

                /*const participantPrivateKeys = participantKeys.map(wif => {
                    try {
                        return bsv.PrivateKey.fromWIF(wif)
                    } catch (error) {
                        throw new Error(`Invalid participant key: ${wif.substring(0, 6)}...`)
                    }
                });

                //const allPrivateKeys = [privateKey, ...participantPrivateKeys];
                
                const allPrivateKeys = [
                        privateKey,   // PRIVATE_KEY (purse)
                        ...participantPrivateKeys
                    ];*/
                // Preparar todas las claves privadas (purse + participantes)
                const allPrivateKeys = [privateKey]

                // Agregar claves de participantes
                participantKeys.forEach((wif) => {
                    try {
                        if (wif && wif.trim() !== '') {
                            allPrivateKeys.push(
                                bsv.PrivateKey.fromWIF(wif.trim())
                            )
                        }
                    } catch (error) {
                        console.error(
                            `Invalid participant key: ${wif.substring(0, 6)}...`
                        )
                    }
                })

                console.log(
                    `Using ${allPrivateKeys.length} private keys for signing`
                )

                // Verificar que tengamos suficientes firmas (al menos 3 de 5)
                if (allPrivateKeys.length < 3) {
                    throw new Error(
                        `Insufficient keys: need at least 3, got ${allPrivateKeys.length}`
                    )
                }

                const publicKeys = allPrivateKeys.map((pk) => pk.publicKey)
                const address = privateKey.toAddress()
                //const addresses = allPrivateKeys.map(pk => pk.toAddress());
                const allUtxos = await provider.listUnspent(address)
                const confirmedUtxos = getConfirmedUtxos(allUtxos)

                if (confirmedUtxos.length === 0) {
                    throw new Error(
                        'No confirmed UTXOs available for transaction'
                    )
                }

                const signer = new TestWallet(allPrivateKeys, provider)

                await instance.connect(signer)

                const { tx: unlockTx } = await instance.methods.pay(
                    (sigResps: SignatureResponse[]) =>
                        findSigs(sigResps, publicKeys),
                    publicKeys.map((publicKey) =>
                        PubKey(publicKey.toByteString())
                    ),
                    {
                        pubKeyOrAddrToSign: publicKeys,
                        //changeAddress: address,
                    } as MethodCallOptions<Escrowcontract>
                )

                //console.log('Contract unlocked, transaction ID:', unlockTx.id);
                console.log('✅ Contract pay method called successfully!')
                console.log(`Transaction ID: ${unlockTx.id}`)
                return {
                    txId: unlockTx.id,
                }
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`Attempt ${attempt} failed: ${error.message}`)

                    if (
                        error.message.includes('500') &&
                        error.message.includes('txn-mempool-conflict')
                    ) {
                        console.log(
                            `Mempool conflict detected. Retrying in ${delay}ms...`
                        )
                    }
                } else {
                    console.error(
                        `Attempt ${attempt} failed with unknown error:`,
                        error
                    )
                }

                console.error(`Attempt ${attempt} failed.`)

                if (attempt < maxAttempts) {
                    console.log(`Retrying in ${delay}ms...`)
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    delay *= 2
                } else {
                    // CORRECCIÓN: Lanzar error después de agotar todos los intentos
                    throw new Error(`All ${maxAttempts} call attempts failed`)
                }
            }
        }

        // Esta línea nunca debería ejecutarse, pero TypeScript necesita ver un return
        throw new Error('Unexpected execution path')
    }
    return callWithRetry()
}

const participantKeys = [
    'L3ACtYZxJwMNs4h8pagNsC2B8t7iWB6Zk4Ffb2o65qYakkHdPmqb',
    'KxgAsLj2Db5wanVL9bahW7ETAWm9ujyYouGxyR1p4MDPxpVvf6tY',
    'KxWDwzqrHSoM6N2VeFJZHXS54enbY1EgRpcRrR5BwKPBNLXGZLJm',
    'L1jeCD1urUGLhK5EMv4zxwei2BaQJpQhWikAcP3m5ZWz6oDHdSyX',
    'Kz3EyUNUNisjjXcKfNkRyvKFViM2tKrQzbE8qoXmmskJ2jawe5M8',
] //OJO AQUÍ, NUMERO DE FIRMAS INSUFICIENTE, QUITÉ LA PRIMERA POR SER LA DEL PURSE. ¿CÓMO VA?

main(
    '1d82c1dc9522c0b41be40d414a46c654ed66c7000030130c15ee617013bb81b9',
    participantKeys
)
    .then((result) => {
        console.log('🎉 Success! Transaction ID:', result.txId)
        process.exit(0)
    })
    .catch((error) => {
        console.error('💥 Error:', error)
        process.exit(1)
    })
