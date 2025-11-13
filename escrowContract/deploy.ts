import { Escrowcontract, SIGS } from './src/contracts/escrowcontract'
import {
    bsv,
    TestWallet,
    Addr,
    FixedArray,
    hash160,
    PubKey,
    UTXO,
} from 'scrypt-ts'

import { GNProvider } from 'scrypt-ts/dist/providers/gn-provider'

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config()

if (!process.env.PRIVATE_KEY) {
    throw new Error('No "PRIVATE_KEY" found in .env file')
}

const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '')
//const privateKey2 = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY_2 || '');

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos
}
const woc_api_key = process.env.WOC_API_KEY

if (!woc_api_key) {
    throw new Error('No "WOC_API_KEY" found in .env file')
}

const network = bsv.Networks.mainnet // o bsv.Networks.testnet
const provider = new GNProvider(network, woc_api_key)

async function main() {
    await Escrowcontract.loadArtifact()

    // TODO: Adjust the amount of satoshis locked in the smart contract:
    const amount = 10
    const lockTimeMin = 1761932884n //time of expiration or deadline of the contract in seconds, GN will be sent back

    // Claves públicas para el multisig
    const publicKeys: PubKey[] = [
        PubKey(
            bsv.PublicKey.fromString(
                '038e5022af542f137c6125a8aac70cac6ade4f20ebcd591d5b75567b2c7d7d69b1'
            ).toHex()
        ), //PURSE
        PubKey(
            bsv.PublicKey.fromString(
                '0349dbb90d3392b029b35567f087694328028e9e5f1188601da0c8b330d40ae64a'
            ).toHex()
        ), //ALICE
        PubKey(
            bsv.PublicKey.fromString(
                '03641f8c39e1ebae3f4a9589be7240edaf0bf788ed954058442606340b32bb0d49'
            ).toHex()
        ), //BOB
        PubKey(
            bsv.PublicKey.fromString(
                '024b879cb0b0b96f73f0587fc083e5a1e7dee89f26f17cf25e4f1affefecc6ad1d'
            ).toHex()
        ), //ARBITER
    ]

    //,
    //PubKey(bsv.PublicKey.fromString('0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634').toHex())
    const addresses: FixedArray<Addr, typeof SIGS> = publicKeys.map((pubKey) =>
        Addr(hash160(pubKey.toString()))
    ) as FixedArray<Addr, typeof SIGS>
    console.log(addresses)

    const deployWithRetry = async (
        attempts = 4,
        delay = 3000
    ): Promise<[string]> => {
        //let lastError: Error | null = null
        for (let i = 0; i < attempts; i++) {
            try {
                //const keyUsed: PrivateKey = i < 3 ? privateKey : privateKey2;

                console.log(`Deployment attempt ${i + 1}...`)

                const address = privateKey.toAddress() //allPrivateKeys.map(pk => pk.toAddress());
                const allUtxos = await provider.listUnspent(address)
                const confirmedUtxos = getConfirmedUtxos(allUtxos)

                console.log(`Found ${confirmedUtxos.length} confirmed UTXOs`)

                const signer = new TestWallet(privateKey, provider)

                if (confirmedUtxos.length === 0) {
                    throw new Error(
                        'No hay UTXOs confirmados disponibles para el despliegue'
                    )
                }

                // Crear nueva instancia de contrato
                const escrowInstance = new Escrowcontract(
                    addresses,
                    lockTimeMin
                )
                await escrowInstance.connect(signer)

                // Intentar despliegue
                const deployTx = await escrowInstance.deploy(amount)

                // Retornar resultado con clave usada
                return [deployTx.id]
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`Attempt ${i + 1} failed: ${error.message}`)

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
                        `Attempt ${i + 1} failed with unknown error:`,
                        error
                    )
                }

                if (i < attempts - 1) {
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    delay *= 2
                }
            }
        }
        throw new Error(`All deployment attempts failed`)
    }

    try {
        const [txId] = await deployWithRetry()
        console.log(`\nEscrowcontract deployed successfully!`)
        console.log(`Transaction ID: ${txId}`)
        //console.log(`Key used: ${keyUsed}\n`)

        return [txId]
    } catch (error) {
        console.error('\nFatal error during deployment:', error)
        throw error
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    process.exit(1)
})

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    process.exit(1)
})

main().catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
})
