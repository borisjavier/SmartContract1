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
exports.getContractState = exports.pay = void 0;
const paycontract_1 = require("./src/contracts/paycontract");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const scrypt_ts_1 = require("scrypt-ts");
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const gn_wallet_1 = require("gn-wallet");
const dotenv = __importStar(require("dotenv"));
const retries_1 = require("./retries");
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
function getConfirmedUtxos(utxos) {
    return utxos;
}
async function pay(params) {
    if (!process.env.WOC_API_KEY)
        throw new Error("WOC_API_KEY environment variable is not set");
    if (!process.env.PRIVATE_KEY)
        throw new Error("Private key is required in .env");
    if (!params.ownerPubKey)
        throw new Error("Owner public key is required");
    const privateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(params.purse || '');
    const woc_api_key = process.env.WOC_API_KEY;
    const provider = new gn_provider_1.GNProvider(scrypt_ts_1.bsv.Networks.mainnet, woc_api_key, '', {
        bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app'
    });
    const address = privateKey.toAddress();
    const allUtxos = await (0, retries_1.withRetries)(() => provider.listUnspent(address));
    const confirmedUtxos = getConfirmedUtxos(allUtxos);
    if (confirmedUtxos.length === 0) {
        throw new Error("No hay UTXOs confirmados disponibles para el pago");
    }
    const signer = new gn_wallet_1.GNWallet(privateKey, provider, {
        targetUtxos: 1,
        dustLimit: 546,
        cacheTTL: 30000
    });
    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
    if (!fs.existsSync(artifactPath))
        throw new Error(`Artefacto no encontrado en: ${artifactPath}`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await paycontract_1.PaymentContract.loadArtifact(artifact);
    // 1. Cargar instancia del contrato desde la blockchain            
    const txResponse = await provider.getTransaction(params.txId);
    const instance = paycontract_1.PaymentContract.fromTx(txResponse, params.atOutputIndex);
    // 2. Constantes del nuevo pago
    const currentDate = BigInt(Math.floor(Date.now() / 1000));
    const txIdPagoHex = params.txidPago;
    const qtyPagoBigInt = BigInt(params.qtyPago); // Unificado usando qtyPago
    await instance.connect(signer);
    const nextInstance = instance.next();
    // 3. MAGIA OFF-CHAIN: Manipulación directa del Buffer Binario
    const currentIndex = Number(instance.paymentsCount);
    const max = Number(instance.maxPayments);
    if (currentIndex >= max)
        throw new Error("El contrato ya ha registrado el número máximo de pagos.");
    const ledgerBuffer = Buffer.from(instance.paymentsLedger, 'hex');
    const offset = currentIndex * 56;
    ledgerBuffer.writeBigInt64LE(currentDate, offset + 8);
    ledgerBuffer.write(txIdPagoHex, offset + 16, 32, 'hex');
    ledgerBuffer.writeBigInt64LE(qtyPagoBigInt, offset + 48);
    nextInstance.paymentsLedger = (0, scrypt_ts_1.toByteString)(ledgerBuffer.toString('hex'));
    nextInstance.paymentsCount = instance.paymentsCount + 1n;
    if (nextInstance.paymentsCount === instance.maxPayments) {
        nextInstance.isValid = false;
    }
    const pubKey = (0, scrypt_ts_1.PubKey)(privateKey.publicKey.toHex());
    const publicKey = privateKey.publicKey;
    // 4. Llamada al contrato
    try {
        const { tx: unlockTx } = await (0, retries_1.withRetries)(async () => {
            await instance.connect(signer);
            return await instance.methods.pay((sigResps) => (0, scrypt_ts_1.findSig)(sigResps, publicKey), pubKey, currentDate, (0, scrypt_ts_1.toByteString)(txIdPagoHex), qtyPagoBigInt, {
                next: {
                    instance: nextInstance,
                    balance: instance.balance,
                },
                pubKeyOrAddrToSign: publicKey,
            });
        });
        // 5. Preparar resultado limpio
        const result = {
            lastStateTxid: unlockTx.id,
            state: nextInstance.paymentsLedger,
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
// -----------------------------------------------------------------------------
// LECTURA DEL ESTADO DEL CONTRATO
// -----------------------------------------------------------------------------
async function getContractState(txId, atOutputIndex = 0) {
    if (!process.env.WOC_API_KEY)
        throw new Error("WOC_API_KEY no configurado");
    // Instanciar solo el proveedor (modo lectura, no necesitamos el GNWallet ni PrivateKey)
    const provider = new gn_provider_1.GNProvider(scrypt_ts_1.bsv.Networks.mainnet, process.env.WOC_API_KEY, '', {
        bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app'
    });
    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json'); // Ruta ajustada a Cloud Run
    if (!fs.existsSync(artifactPath))
        throw new Error(`Artefacto no encontrado: ${artifactPath}`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await paycontract_1.PaymentContract.loadArtifact(artifact);
    try {
        const txResponse = await provider.getTransaction(txId);
        const instance = paycontract_1.PaymentContract.fromTx(txResponse, atOutputIndex);
        const parsedState = [];
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
    }
    catch (error) {
        throw new Error(`Error al leer el estado del contrato: ${error.message}`);
    }
}
exports.getContractState = getContractState;
//# sourceMappingURL=payScriptModule.js.map