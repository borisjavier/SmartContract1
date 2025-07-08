"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pay = void 0;
const paycontract_1 = require("./src/contracts/paycontract"); //Timestamp,
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const scrypt_ts_1 = require("scrypt-ts");
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const dotenv = __importStar(require("dotenv"));
// Cargar el archivo .env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
// Función auxiliar para verificar si los txids están llenos
function filledTxids(dataPayments, tx0) {
    const n = dataPayments.length;
    if (n < 2) {
        return false;
    }
    for (let i = 0; i < n - 1; i++) {
        if (dataPayments[i].txid === tx0) {
            return false;
        }
    }
    return true;
}
function getConfirmedUtxos(utxos) {
    return utxos.filter(utxo => utxo.height >= 0);
}
const privateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '');
async function pay(params) {
    console.log('params.datas: ', params.datas);
    if (!process.env.PRIVATE_KEY) {
        throw new Error("Private key is required in .env");
    }
    if (!params.ownerPubKey) {
        throw new Error("Owner public key is required");
    }
    const woc_api_key = 'mainnet_3a3bcb1b859226f079def02a452cb9a4';
    const provider = new gn_provider_1.GNProvider(scrypt_ts_1.bsv.Networks.mainnet, woc_api_key);
    const address = privateKey.toAddress();
    const allUtxos = await provider.listUnspent(address);
    const confirmedUtxos = getConfirmedUtxos(allUtxos);
    if (confirmedUtxos.length === 0) {
        throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
    }
    const signer = new scrypt_ts_1.TestWallet(privateKey, provider);
    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artefacto no encontrado en: ${artifactPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    // Cargar artefacto del contrato
    await paycontract_1.PaymentContract.loadArtifact(artifact);
    // Cargar instancia del contrato desde la blockchain            
    const txResponse = await provider.getTransaction(params.txId);
    const instance = paycontract_1.PaymentContract.fromTx(txResponse, params.atOutputIndex);
    // Preparar constantes
    const tx0 = (0, scrypt_ts_1.toByteString)('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
    const currentDate = BigInt(Math.floor(Date.now() / 1000));
    //const currentDate: bigint = BigInt(Math.floor(Date.now() / 1000));
    const txIdPago = (0, scrypt_ts_1.toByteString)(params.txidPago);
    //const txIdPago = toByteString(txidPago);//obtida da publicação da transação GN
    // Convertir los arrays de entrada a FixedArray
    const dataPayments = (0, scrypt_ts_1.fill)({ timestamp: 0n, txid: tx0 }, paycontract_1.N);
    for (let i = 0; i < paycontract_1.N; i++) {
        dataPayments[i] = {
            timestamp: BigInt(params.datas[i]),
            txid: (0, scrypt_ts_1.toByteString)(params.txids[i] || tx0.toString()),
        };
    }
    // Preparar el próximo estado
    let isValid = true;
    let updated = false;
    for (let i = 0; i < paycontract_1.N; i++) {
        if (!updated && dataPayments[i].timestamp < currentDate && dataPayments[i].txid === tx0) {
            if (i === paycontract_1.N - 1 && filledTxids(Array.from(dataPayments), tx0)) {
                isValid = false;
            }
            dataPayments[i] = {
                timestamp: currentDate,
                txid: txIdPago,
            };
            updated = true;
        }
    }
    if (dataPayments.length !== paycontract_1.N) {
        throw new Error(`Longitud inválida de dataPayments: esperado ${paycontract_1.N}, obtenido ${dataPayments.length}`);
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
    const pubKey = (0, scrypt_ts_1.PubKey)(privateKey.publicKey.toHex());
    const publicKey = privateKey.publicKey;
    // Llamar al método del contrato
    try {
        const { tx: unlockTx } = await instance.methods.pay((sigResps) => (0, scrypt_ts_1.findSig)(sigResps, publicKey), pubKey, currentDate, txIdPago, {
            next: {
                instance: nextInstance,
                balance: instance.balance,
            },
            pubKeyOrAddrToSign: publicKey,
        });
        // Preparar resultado
        const result = {
            lastStateTxid: unlockTx.id,
            state: nextInstance.dataPayments.map(p => ({
                timestamp: p.timestamp.toString(),
                txid: p.txid
            })),
            addressGN: (0, scrypt_ts_1.Addr)(nextInstance.addressGN).toString(),
            amountGN: nextInstance.amountGN.toString(),
            isValid: nextInstance.isValid
        };
        console.log('Contract unlocked, transaction ID:', unlockTx.id);
        return result;
    }
    catch (error) {
        console.error('Contract call failed:', error);
        throw new Error(`Error during contract call: ${error.message}`);
    }
}
exports.pay = pay;
//# sourceMappingURL=payScriptModule.js.map