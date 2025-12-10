
import { PaymentContract, Payment, N } from './src/contracts/paycontract';//Timestamp,
import * as path from 'path';
import * as fs from 'fs';
import { bsv, PubKey, Addr, toByteString, FixedArray, findSig, fill, MethodCallOptions, TestWallet, ByteString, UTXO } from 'scrypt-ts';
import { GNProvider } from 'scrypt-ts/dist/providers/gn-provider';
import * as dotenv from 'dotenv';

// Cargar el archivo .env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath })

// Tipos para parámetros
export type PayParams = {
    txId: string;
    atOutputIndex: number;
    datas: string[];//FixedArray<Timestamp, typeof N>; // //
    txids: string[];//FixedArray<string, typeof N>; ////
    txidPago: string,
    qtyTokens: number,
    ownerPubKey: string,
    purse: string
};

export type PaymentItem = {
    timestamp: string;  // BigInt serializado como string
    txid: string;
};

export type PayResult = {
    lastStateTxid: string;
    state: PaymentItem[]; //PaymentState;  // Tipo específico según tu contrato
    addressGN: string;
    amountGN: string;
    isValid: boolean;
};

// Función auxiliar para verificar si los txids están llenos
function filledTxids(dataPayments: Payment[], tx0: ByteString): boolean {
    const n = dataPayments.length;
    const emptyTxidStr = tx0.toString();

    if (n === 1) {
        return dataPayments[0].txid !== emptyTxidStr;
    } else {    
        for (let i = 0; i < n - 1; i++) {
            if (dataPayments[i].txid === emptyTxidStr) {
                return false;
            }
        }
    }

    return true;
}

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos
}


//const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '');

export async function pay(params: PayParams): Promise<PayResult> {
    console.log('params.datas: ',params.datas);
    if (!process.env.WOC_API_KEY) {
        throw new Error("WOC_API_KEY environment variable is not set");
    }

    const privateKey = bsv.PrivateKey.fromWIF(params.purse || '');
    if (!process.env.PRIVATE_KEY) {
    throw new Error("Private key is required in .env")
    }

    if (!params.ownerPubKey) {
        throw new Error("Owner public key is required");
    }
    const woc_api_key = process.env.WOC_API_KEY;

    const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key);

    const address = privateKey.toAddress();
    const allUtxos = await provider.listUnspent(address);
    const confirmedUtxos = getConfirmedUtxos(allUtxos);

    if (confirmedUtxos.length === 0) {
            throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
        }

    
    const signer = new TestWallet(privateKey, provider);

    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
        
        if (!fs.existsSync(artifactPath)) {
            throw new Error(`Artefacto no encontrado en: ${artifactPath}`);
        }
        

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    // Cargar artefacto del contrato
    await PaymentContract.loadArtifact(artifact);
    
    // Cargar instancia del contrato desde la blockchain            
    const txResponse = await provider.getTransaction(params.txId);
                
    const instance = PaymentContract.fromTx(txResponse, params.atOutputIndex)
    

    
    // Preparar constantes
    const tx0 = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
    const currentDate = BigInt(Math.floor(Date.now() / 1000));
    //const currentDate: bigint = BigInt(Math.floor(Date.now() / 1000));
    const txIdPago = toByteString(params.txidPago);
    //const txIdPago = toByteString(txidPago);//obtida da publicação da transação GN

    // Convertir los arrays de entrada a FixedArray
    const dataPayments: FixedArray<Payment, typeof N> = fill({ timestamp: 0n, txid: tx0 }, N);
    for (let i = 0; i < N; i++) {
        dataPayments[i] = {
            timestamp: BigInt(params.datas[i]),
            txid: toByteString(params.txids[i] || tx0.toString()),
        };
    }

    // Preparar el próximo estado
    let isValid = true;
    let updated = false;

    for (let i = 0; i < N; i++) {
        if (!updated && dataPayments[i].timestamp < currentDate && dataPayments[i].txid === tx0) {
            if (i === N - 1 && filledTxids(Array.from(dataPayments), tx0)) {
                isValid = false;
            }
            dataPayments[i] = {
                timestamp: currentDate,
                txid: txIdPago,
            };
            updated = true;
        }
    }

    if (dataPayments.length !== N) {
    throw new Error(`Longitud inválida de dataPayments: esperado ${N}, obtenido ${dataPayments.length}`);
    }   
    console.log(`dataPayments es: ${JSON.stringify(dataPayments)}`);

    // Crear la próxima instancia
    await instance.connect(signer); //getDefaultSigner(privateKey)
    const nextInstance = instance.next();
    nextInstance.dataPayments = dataPayments;
    nextInstance.isValid = isValid;
    nextInstance.qtyTokens = BigInt(params.qtyTokens);

    // Conectar la instancia al signer
    await instance.connect(signer);
    const pubKey = PubKey(privateKey.publicKey.toHex());
    const publicKey = privateKey.publicKey;

    // Llamar al método del contrato
    try {
        const { tx: unlockTx } = await instance.methods.pay(
            (sigResps) => findSig(sigResps, publicKey),
            pubKey,
            currentDate,
            txIdPago,
            {
                next: {
                    instance: nextInstance,
                    balance: instance.balance,
                },
                pubKeyOrAddrToSign: publicKey,
            } as MethodCallOptions<PaymentContract>
        );

        // Preparar resultado
        const result: PayResult = {
            lastStateTxid: unlockTx.id,
            state: nextInstance.dataPayments.map(p => ({
                timestamp: p.timestamp.toString(),
                txid: p.txid
            })),
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