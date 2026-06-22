import { PaymentContract } from './src/contracts/paycontract'; // O paycontracto1, asegúrate del nombre
import * as path from 'path';
import * as fs from 'fs';
import { bsv, PubKey, Addr, toByteString, findSig, MethodCallOptions, UTXO } from 'scrypt-ts';
import { GNProvider } from 'scrypt-ts/dist/providers/gn-provider';
import { GNWallet } from 'gn-wallet';
import * as dotenv from 'dotenv';
import { withRetries } from './retries';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath })

export type PayParams = {
    txId: string;
    atOutputIndex: number;
    datas?: string[]; // Ignorado por la nueva lógica binaria
    txids?: string[]; // Ignorado por la nueva lógica binaria
    txidPago: string;
    qtyTokens: number;
    ownerPubKey: string;
    purse: string;
};

export type PayResult = {
    lastStateTxid: string;
    state: string; // Ahora retornamos el String Hexadecimal completo
    addressGN: string;
    amountGN: string;
    isValid: boolean;
};

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos;
}

export async function pay(params: PayParams): Promise<PayResult> {
    if (!process.env.WOC_API_KEY) {
        throw new Error("WOC_API_KEY environment variable is not set");
    }

    const privateKey = bsv.PrivateKey.fromWIF(params.purse || '');
    if (!process.env.PRIVATE_KEY) {
        throw new Error("Private key is required in .env");
    }

    if (!params.ownerPubKey) {
        throw new Error("Owner public key is required");
    }
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
        targetUtxos: 50,   
        dustLimit: 546,    
        cacheTTL: 30000    
    });

    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
        
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artefacto no encontrado en: ${artifactPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await PaymentContract.loadArtifact(artifact);
    
    // 1. Cargar instancia del contrato desde la blockchain            
    const txResponse = await provider.getTransaction(params.txId);
    const instance = PaymentContract.fromTx(txResponse, params.atOutputIndex);
    
    // 2. Constantes del nuevo pago
    const currentDate = BigInt(Math.floor(Date.now() / 1000));
    const txIdPagoHex = params.txidPago; // 64 caracteres hexadecimales
    const qtyPago = BigInt(params.qtyTokens);

    await instance.connect(signer);
    const nextInstance = instance.next();

    // ----------------------------------------------------------------------
    // 3. MAGIA OFF-CHAIN: Manipulación directa del Buffer Binario
    // ----------------------------------------------------------------------
    const currentIndex = Number(instance.paymentsCount);
    const max = Number(instance.maxPayments);

    if (currentIndex >= max) {
        throw new Error("El contrato ya ha registrado el número máximo de pagos.");
    }

    // Cargamos el ledger actual en un Buffer de Node.js
    const ledgerBuffer = Buffer.from(instance.paymentsLedger, 'hex');
    const offset = currentIndex * 56; // Salto directo O(1) al bloque que toca editar

    // Escribimos los nuevos datos respetando la estructura de 56 bytes:
    // [0-8 bytes] scheduledDate (No se toca)
    // [8-16 bytes] realTimestamp (Escribimos currentDate en Little Endian)
    ledgerBuffer.writeBigInt64LE(currentDate, offset + 8);
    
    // [16-48 bytes] txid (Escribimos el txid en hexadecimal)
    ledgerBuffer.write(txIdPagoHex, offset + 16, 32, 'hex');
    
    // [48-56 bytes] qtyPago (Escribimos los tokens en Little Endian)
    ledgerBuffer.writeBigInt64LE(qtyPago, offset + 48);

    // Asignamos el buffer modificado a la próxima instancia
    nextInstance.paymentsLedger = toByteString(ledgerBuffer.toString('hex'));
    
    // Actualizamos el contador y la validez
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
                // PRECAUCIÓN: Revisa si qtyPago debe pasar a la llamada aquí
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