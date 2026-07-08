import { PaymentContract } from './src/contracts/paycontract'; 
import * as path from 'path';
import * as fs from 'fs';
import { bsv, PubKey, Addr, toByteString, findSig, MethodCallOptions, UTXO } from 'scrypt-ts';
import { GNProvider } from 'scrypt-ts/dist/providers/gn-provider';
import { GNWallet } from 'gn-wallet';
import * as dotenv from 'dotenv';
import { withRetries } from './retries';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

export type PayParams = {
    txId: string;
    atOutputIndex: number;
    txidPago: string;
    qtyPago: number; // Monto pagado
    ownerPubKey: string;
    purse: string;
};

export type PaymentItem = {
    scheduledDate: string;
    realTimestamp: string;
    txid: string;
    qtyPago: string;
};

export type PayResult = {
    lastStateTxid: string;
    state: string; // Retorna el String Hexadecimal completo
    addressGN: string;
    amountGN: string;
    isValid: boolean;
};

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos;
}

export async function pay(params: PayParams): Promise<PayResult> {
    if (!process.env.WOC_API_KEY) throw new Error("WOC_API_KEY environment variable is not set");
    if (!process.env.PRIVATE_KEY) throw new Error("Private key is required in .env");
    if (!params.ownerPubKey) throw new Error("Owner public key is required");

    const privateKey = bsv.PrivateKey.fromWIF(params.purse || '');
    const woc_api_key = process.env.WOC_API_KEY;

    const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key, '', { 
        bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app' 
    });

    const address = privateKey.toAddress();
    const allUtxos = await withRetries(() => provider.listUnspent(address));
    const confirmedUtxos = getConfirmedUtxos(allUtxos);

    if (confirmedUtxos.length === 0) {
        throw new Error("No hay UTXOs confirmados disponibles para el pago");
    }

    const signer = new GNWallet(privateKey, provider, {
        targetUtxos: 1,   
        dustLimit: 546,    
        cacheTTL: 30000    
    });

    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
        
    if (!fs.existsSync(artifactPath)) throw new Error(`Artefacto no encontrado en: ${artifactPath}`);

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await PaymentContract.loadArtifact(artifact);
    
    // 1. Cargar instancia del contrato desde la blockchain            
    const txResponse = await provider.getTransaction(params.txId);
    const instance = PaymentContract.fromTx(txResponse, params.atOutputIndex);
    
    // 2. Constantes del nuevo pago
    const currentDate = BigInt(Math.floor(Date.now() / 1000));
    const txIdPagoHex = params.txidPago; 
    const qtyPagoBigInt = BigInt(params.qtyPago); // Unificado usando qtyPago

    await instance.connect(signer);
    const nextInstance = instance.next();

    // 3. MAGIA OFF-CHAIN: Manipulación directa del Buffer Binario
    const currentIndex = Number(instance.paymentsCount);
    const max = Number(instance.maxPayments);

    if (currentIndex >= max) throw new Error("El contrato ya ha registrado el número máximo de pagos.");

    const ledgerBuffer = Buffer.from(instance.paymentsLedger, 'hex');
    const offset = currentIndex * 56; 

    ledgerBuffer.writeBigInt64LE(currentDate, offset + 8);
    ledgerBuffer.write(txIdPagoHex, offset + 16, 32, 'hex');
    ledgerBuffer.writeBigInt64LE(qtyPagoBigInt, offset + 48);

    nextInstance.paymentsLedger = toByteString(ledgerBuffer.toString('hex'));
    nextInstance.paymentsCount = instance.paymentsCount + 1n;
    if (nextInstance.paymentsCount === instance.maxPayments) {
        nextInstance.isValid = false;
    }

    const pubKey = PubKey(privateKey.publicKey.toHex());
    const publicKey = privateKey.publicKey;

    // 4. Llamada al contrato
    try {
        const { tx: unlockTx } = await withRetries(async () => {
            await instance.connect(signer);
            return await instance.methods.pay(
                (sigResps) => findSig(sigResps, publicKey),
                pubKey,
                currentDate,
                toByteString(txIdPagoHex),
                qtyPagoBigInt,
                {
                    next: {
                        instance: nextInstance,
                        balance: instance.balance,
                    },
                    pubKeyOrAddrToSign: publicKey,
                } as MethodCallOptions<PaymentContract>
            );
        });

        // 5. Preparar resultado limpio
        const result: PayResult = {
            lastStateTxid: unlockTx.id,
            state: nextInstance.paymentsLedger, 
            addressGN: Addr(nextInstance.addressGN).toString(),
            amountGN: nextInstance.amountGN.toString(),
            isValid: nextInstance.isValid
        };

        console.log('Contract unlocked, transaction ID:', unlockTx.id);
        return result;
    } catch (error) {
        console.error('Contract call failed:', error);
        throw new Error(`Error during contract call: ${error.message}`);
    }
}

// -----------------------------------------------------------------------------
// LECTURA DEL ESTADO DEL CONTRATO
// -----------------------------------------------------------------------------
export async function getContractState(txId: string, atOutputIndex: number = 0): Promise<PaymentItem[]> {
    if (!process.env.WOC_API_KEY) throw new Error("WOC_API_KEY no configurado");
    
    // Instanciar solo el proveedor (modo lectura, no necesitamos el GNWallet ni PrivateKey)
    const provider = new GNProvider(bsv.Networks.mainnet, process.env.WOC_API_KEY, '', { 
        bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app' 
    });

    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json'); // Ruta ajustada a Cloud Run
    if (!fs.existsSync(artifactPath)) throw new Error(`Artefacto no encontrado: ${artifactPath}`);
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await PaymentContract.loadArtifact(artifact);

    try {
        const txResponse = await provider.getTransaction(txId);
        const instance = PaymentContract.fromTx(txResponse, atOutputIndex);

        const parsedState: PaymentItem[] = [];
        const ledgerBuffer = Buffer.from(instance.paymentsLedger, 'hex');
        const slotSize = 56;
        
        const max = Number(instance.maxPayments);

        for (let i = 0; i < max; i++) {
            const off = i * slotSize;
            parsedState.push({
                scheduledDate: ledgerBuffer.readBigInt64LE(off).toString(),
                realTimestamp: ledgerBuffer.readBigInt64LE(off + 8).toString(),
                txid: ledgerBuffer.subarray(off + 16, off + 48).toString('hex'),
                qtyPago: ledgerBuffer.readBigInt64LE(off + 48).toString()
            });
        }
        
        return parsedState;
    } catch (error) {
        throw new Error(`Error al leer el estado del contrato: ${error.message}`);
    }
}