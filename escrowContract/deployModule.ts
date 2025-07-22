import * as path from 'path';
import * as fs from 'fs';
import { Escrowcontract, SIGS } from './src/contracts/escrowcontract';
import {
    bsv,
    FixedArray,
    TestWallet,
    Addr,
    PubKey,
    hash160
} from 'scrypt-ts';
import { GNProvider, UTXOWithHeight } from 'scrypt-ts/dist/providers/gn-provider';
import * as dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Tipos para parámetros
export type EscrowDeployParams = {
    publicKeys: string[];
    lockTimeMin: bigint;
    amount: number;
};

export type EscrowDeploymentResult = {
    txId: string;
    keyUsed: string;
};

function getPrivateKey(attempt: number): bsv.PrivateKey {
    if (attempt < 3) {
        if (!process.env.PRIVATE_KEY) {
            throw new Error("No \"PRIVATE_KEY\" found in .env");
        }
        return bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY);
    } else {
        if (!process.env.PRIVATE_KEY_2) {
            throw new Error("No \"PRIVATE_KEY_2\" found in .env for final attempt");
        }
        return bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY_2);
    }
}

function getConfirmedUtxos(utxos: UTXOWithHeight[]): UTXOWithHeight[] {
    return utxos.filter(utxo => utxo.height >= 0);
}

function validatePublicKeys(publicKeys: string[]): void {
    if (!Array.isArray(publicKeys) || publicKeys.length !== SIGS) {
        throw new Error(`publicKeys must be an array of exactly ${SIGS} elements`);
    }

    publicKeys.forEach((key, index) => {
        if (typeof key !== 'string') {
            throw new Error(`publicKey at index ${index} must be a string`);
        }
        if (key.length !== 66) {
            throw new Error(`publicKey at index ${index} has invalid length (${key.length}), must be 66 characters`);
        }
        if (!key.startsWith('02') && !key.startsWith('03')) {
            throw new Error(`publicKey at index ${index} has invalid prefix (${key.slice(0, 2)}), must start with 02 or 03`);
        }
        if (!/^[0-9a-fA-F]+$/.test(key)) {
            throw new Error(`publicKey at index ${index} contains non-hexadecimal characters`);
        }
    });
}

export async function deployEscrowContract(params: EscrowDeployParams): Promise<EscrowDeploymentResult> {
    // Validaciones críticas
    if (!process.env.WOC_API_KEY) {
        throw new Error("WOC_API_KEY environment variable is not set");
    }
    
    validatePublicKeys(params.publicKeys);
    
    // Cargar artefacto
    const artifactPath = path.resolve(__dirname, '../artifacts/escrowcontract.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at: ${artifactPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await Escrowcontract.loadArtifact(artifact);

    // Configurar provider
    const provider = new GNProvider(bsv.Networks.mainnet, process.env.WOC_API_KEY);
    
    // Convertir public keys a formato de contrato
    const pubKeys = params.publicKeys.map(pk => PubKey(pk));
    const addresses = pubKeys.map(pk => Addr(hash160(pk))) as FixedArray<Addr, typeof SIGS>;

    // Función interna para reintentos
    const deployWithRetry = async (attempts = 4, delay = 3000): Promise<EscrowDeploymentResult> => {
        let lastError: Error | null = null;
        
        for (let i = 0; i < attempts; i++) {
            try {
                const privateKey = getPrivateKey(i);
                const keyUsed = i < 3 ? 'PRIVATE_KEY' : 'PRIVATE_KEY_2';
                
                const address = privateKey.toAddress();
                const allUtxos = await provider.listUnspent(address);
                const confirmedUtxos = getConfirmedUtxos(allUtxos);

                if (confirmedUtxos.length === 0) {
                    throw new Error("No confirmed UTXOs available for deployment");
                }

                const signer = new TestWallet(privateKey, provider);
                const contract = new Escrowcontract(addresses, params.lockTimeMin);
                await contract.connect(signer);

                const deployTx = await contract.deploy(params.amount, {
                    utxos: confirmedUtxos
                });

                return {
                    txId: deployTx.id,
                    keyUsed: keyUsed
                };
                
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${i+1} failed: ${error.message}`);
                
                if (i < attempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Backoff exponencial
                }
            }
        }
        throw lastError || new Error("All deployment attempts failed");
    };

    return deployWithRetry();
}