import * as path from 'path';
import * as fs from 'fs';
import { Escrowcontract } from './src/contracts/escrowcontract';
import {
    bsv,
    findSigs,
    MethodCallOptions,
    PubKey,
    TestWallet
} from 'scrypt-ts';
import { GNProvider, UTXOWithHeight } from 'scrypt-ts/dist/providers/gn-provider';
import * as dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Tipos para parámetros
export type RefundEscrowParams = {
    txId: string;
    deployerKeyType: 'PRIVATE_KEY' | 'PRIVATE_KEY_2';
    participantKeys: string[];
    atOutputIndex?: number;
};

export type RefundEscrowResult = {
    txId: string;
    usedKeyType: string;
};

function getConfirmedUtxos(utxos: UTXOWithHeight[]): UTXOWithHeight[] {
    return utxos.filter(utxo => utxo.height >= 0);
}

function sanitizePrivateKey(key: string | undefined): bsv.PrivateKey {
    if (!key) throw new Error("Private key is undefined");
    const cleanKey = key.replace(/["';\\\s]/g, '');
    try {
        return bsv.PrivateKey.fromWIF(cleanKey);
    } catch (error) {
        throw new Error(`Invalid private key format: ${cleanKey.substring(0, 6)}...`);
    }
}

export async function refundEscrowContract(params: RefundEscrowParams): Promise<RefundEscrowResult> {
    // Validaciones críticas
    if (!process.env.WOC_API_KEY) {
        throw new Error("WOC_API_KEY environment variable is not set");
    }
    if (!process.env[params.deployerKeyType]) {
        throw new Error(`Deployer key ${params.deployerKeyType} not found in .env`);
    }
    if (!params.participantKeys || params.participantKeys.length === 0) {
        throw new Error("Participant keys are required");
    }

    // Cargar artefacto
    const artifactPath = path.resolve(__dirname, '../artifacts/escrowcontract.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at: ${artifactPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await Escrowcontract.loadArtifact(artifact);

    // Configurar provider
    const provider = new GNProvider(bsv.Networks.mainnet, process.env.WOC_API_KEY);

    const callWithRetry = async (maxAttempts = 4, initialDelay = 3000): Promise<RefundEscrowResult> => {
        let lastError: Error | null = null;
        let delay = initialDelay;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const txResponse = await provider.getTransaction(params.txId);
                // Reconstruir la instancia del contrato desde la transacción existente
                const instance = Escrowcontract.fromTx(txResponse, params.atOutputIndex || 0);

                const deployerPrivateKey = sanitizePrivateKey(process.env[params.deployerKeyType]);
                const additionalKey = sanitizePrivateKey(process.env.PRIVATE_KEY_3);
                if (!additionalKey) {
                    throw new Error("Additional key (PRIVATE_KEY_3) not found in .env");
                }
                const participantPrivateKeys = params.participantKeys.map(wif => {
                    try {
                        return bsv.PrivateKey.fromWIF(wif);
                    } catch (error) {
                        throw new Error(`Invalid participant key: ${wif.substring(0, 6)}...`);
                    }
                });


                let allPrivateKeys;
                if (params.deployerKeyType === "PRIVATE_KEY") {
                    allPrivateKeys = [
                        deployerPrivateKey,   // PRIVATE_KEY (primera)
                        additionalKey,        // PRIVATE_KEY_3 (segunda)
                        ...participantPrivateKeys
                    ];
                } else if (params.deployerKeyType === "PRIVATE_KEY_2") {
                    allPrivateKeys = [
                        additionalKey,        // PRIVATE_KEY_3 (primera)
                        deployerPrivateKey,   // PRIVATE_KEY_2 (segunda)
                        ...participantPrivateKeys
                    ];
                } else {
                    throw new Error(`Tipo de clave de despliegue inválido: ${params.deployerKeyType}`);
                }
                const publicKeys = allPrivateKeys.map(pk => pk.publicKey);

                // Obtener UTXOs para el signer
                const address = deployerPrivateKey.toAddress();
                const allUtxos = await provider.listUnspent(address);
                const confirmedUtxos = getConfirmedUtxos(allUtxos);

                if (confirmedUtxos.length === 0) {
                    throw new Error("No confirmed UTXOs available for transaction");
                }

                const signer = new TestWallet(allPrivateKeys, provider);
                await instance.connect(signer);

                // Obtener el tiempo actual para el lockTime (en segundos)
                const lockTime = Math.floor(Date.now() / 1000);

                const { tx: unlockTx } = await instance.methods.refundDeadline(
                    (sigResps) => findSigs(sigResps, publicKeys),
                    publicKeys.map((publicKey) => PubKey(publicKey.toByteString())),
                    {
                        pubKeyOrAddrToSign: publicKeys,
                        lockTime: lockTime
                    } as MethodCallOptions<Escrowcontract>
                );

                console.log('✅ Escrow contract refundDeadline method called successfully: ', unlockTx.id);
                return {
                    txId: unlockTx.id,
                    usedKeyType: params.deployerKeyType
                };

            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt} failed: ${error.message}`);

                // Manejar errores específicos
                if (error.message.includes('txn-mempool-conflict')) {
                    console.log('Mempool conflict detected. Retrying...');
                } else if (error.message.includes('insufficient fee')) {
                    console.log('Insufficient fee. Adjusting...');
                }

                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Backoff exponencial
                }
            }
        }
        throw lastError || new Error("All call attempts failed");
    };

    return callWithRetry();
}