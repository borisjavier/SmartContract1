import * as path from 'path'
import * as fs from 'fs'
import { Escrowcontract } from './src/contracts/escrowcontract'
import {
    bsv,
    findSigs,
    MethodCallOptions,
    PubKey,
    TestWallet,
    UTXO,
} from 'scrypt-ts'
import { GNProvider } from 'scrypt-ts/dist/providers/gn-provider';
import { withRetries } from './retries';
import * as dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../.env')
dotenv.config({ path: envPath })

const woc_api_key = process.env.WOC_API_KEY

const network = bsv.Networks.mainnet
//const provider = new GNProvider(network, woc_api_key)
const provider = new GNProvider(network, woc_api_key, '', {
    bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app',
})

if (!woc_api_key) {
    throw new Error('No "WOC_API_KEY" found in .env file')
}

// Tipos para parámetros
export type PayEscrowParams = {
    txId: string
    participantKeys: string[]
    atOutputIndex?: number
    contractPK: string
}

export type PayEscrowResult = {
    txId: string
}

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos
}

export async function payEscrowContract(
    params: PayEscrowParams
): Promise<PayEscrowResult> {
    const privateKey = bsv.PrivateKey.fromWIF(params.contractPK)
    if (!params.participantKeys || params.participantKeys.length === 0) {
        throw new Error(
            `Participant keys are required. We have ${JSON.stringify(
                params.participantKeys
            )}`
        )
    }

    // Cargar artefacto
    const artifactPath = path.resolve(
        __dirname,
        '../artifacts/escrowcontract.json'
    )
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at: ${artifactPath}`)
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
    await Escrowcontract.loadArtifact(artifact)

    const callWithRetry = async (
        maxAttempts = 4,
        initialDelay = 3000
    ): Promise<PayEscrowResult> => {
        let lastError: Error | null = null
        let delay = initialDelay

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const txResponse = await provider.getTransaction(params.txId)
                // Reconstruir la instancia del contrato desde la transacción existente
                const instance = Escrowcontract.fromTx(
                    txResponse,
                    params.atOutputIndex || 0
                )

                const allPrivateKeys = [privateKey]

                // Agregar claves de participantes
                params.participantKeys.forEach((wif) => {
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
                const publicKeys = allPrivateKeys.map((pk) => pk.publicKey)

                // Obtener UTXOs para el signer
                const address = privateKey.toAddress()
                //const allUtxos = await provider.listUnspent(address);
                const allUtxos = await withRetries(() => provider.listUnspent(address))
                const confirmedUtxos = getConfirmedUtxos(allUtxos)

                if (confirmedUtxos.length === 0) {
                    throw new Error(
                        'No confirmed UTXOs available for transaction'
                    )
                }

                const signer = new TestWallet(allPrivateKeys, provider)
                await instance.connect(signer)

                /*const { tx: unlockTx } = await instance.methods.pay(
                    (sigResps) => findSigs(sigResps, publicKeys),
                    publicKeys.map((publicKey) =>
                        PubKey(publicKey.toByteString())
                    ),
                    {
                        pubKeyOrAddrToSign: publicKeys,
                    } as MethodCallOptions<Escrowcontract>
                )*/
               const { tx: unlockTx } = await withRetries(async () => {
                    await instance.connect(signer)
                    return await instance.methods.pay(
                        (sigResps) => findSigs(sigResps, publicKeys),
                        publicKeys.map((pk) => PubKey(pk.toByteString())),
                        {
                            pubKeyOrAddrToSign: publicKeys,
                            utxos: confirmedUtxos // Opcional: pasar UTXOs directamente
                        } as MethodCallOptions<Escrowcontract>
                    )
                })

                console.log(
                    '✅ Escrow contract pay method called successfully: ',
                    unlockTx.id
                )
                return {
                    txId: unlockTx.id,
                }
            } catch (error) {
                lastError = error
                console.error(`Attempt ${attempt} failed: ${error.message}`)

                // Manejar errores específicos
                if (error.message.includes('txn-mempool-conflict')) {
                    console.log('Mempool conflict detected. Retrying...')
                } else if (error.message.includes('insufficient fee')) {
                    console.log('Insufficient fee. Adjusting...')
                }

                if (attempt < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    delay *= 2 // Backoff exponencial
                }
            }
        }
        throw lastError || new Error('All call attempts failed')
    }

    return callWithRetry()
}
