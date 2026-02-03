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
exports.payEscrowContract = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const escrowcontract_1 = require("./src/contracts/escrowcontract");
const scrypt_ts_1 = require("scrypt-ts");
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const dotenv = __importStar(require("dotenv"));
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
const woc_api_key = process.env.WOC_API_KEY;
const network = scrypt_ts_1.bsv.Networks.mainnet;
//const provider = new GNProvider(network, woc_api_key)
const provider = new gn_provider_1.GNProvider(network, woc_api_key, '', {
    bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app',
});
if (!woc_api_key) {
    throw new Error('No "WOC_API_KEY" found in .env file');
}
function getConfirmedUtxos(utxos) {
    return utxos;
}
async function payEscrowContract(params) {
    const privateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(params.contractPK);
    if (!params.participantKeys || params.participantKeys.length === 0) {
        throw new Error(`Participant keys are required. We have ${JSON.stringify(params.participantKeys)}`);
    }
    // Cargar artefacto
    const artifactPath = path.resolve(__dirname, '../artifacts/escrowcontract.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at: ${artifactPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await escrowcontract_1.Escrowcontract.loadArtifact(artifact);
    const callWithRetry = async (maxAttempts = 4, initialDelay = 3000) => {
        let lastError = null;
        let delay = initialDelay;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const txResponse = await provider.getTransaction(params.txId);
                // Reconstruir la instancia del contrato desde la transacción existente
                const instance = escrowcontract_1.Escrowcontract.fromTx(txResponse, params.atOutputIndex || 0);
                const allPrivateKeys = [privateKey];
                // Agregar claves de participantes
                params.participantKeys.forEach((wif) => {
                    try {
                        if (wif && wif.trim() !== '') {
                            allPrivateKeys.push(scrypt_ts_1.bsv.PrivateKey.fromWIF(wif.trim()));
                        }
                    }
                    catch (error) {
                        console.error(`Invalid participant key: ${wif.substring(0, 6)}...`);
                    }
                });
                const publicKeys = allPrivateKeys.map((pk) => pk.publicKey);
                // Obtener UTXOs para el signer
                const address = privateKey.toAddress();
                const allUtxos = await provider.listUnspent(address);
                const confirmedUtxos = getConfirmedUtxos(allUtxos);
                if (confirmedUtxos.length === 0) {
                    throw new Error('No confirmed UTXOs available for transaction');
                }
                const signer = new scrypt_ts_1.TestWallet(allPrivateKeys, provider);
                await instance.connect(signer);
                const { tx: unlockTx } = await instance.methods.pay((sigResps) => (0, scrypt_ts_1.findSigs)(sigResps, publicKeys), publicKeys.map((publicKey) => (0, scrypt_ts_1.PubKey)(publicKey.toByteString())), {
                    pubKeyOrAddrToSign: publicKeys,
                });
                console.log('✅ Escrow contract pay method called successfully: ', unlockTx.id);
                return {
                    txId: unlockTx.id,
                };
            }
            catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt} failed: ${error.message}`);
                // Manejar errores específicos
                if (error.message.includes('txn-mempool-conflict')) {
                    console.log('Mempool conflict detected. Retrying...');
                }
                else if (error.message.includes('insufficient fee')) {
                    console.log('Insufficient fee. Adjusting...');
                }
                if (attempt < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    delay *= 2; // Backoff exponencial
                }
            }
        }
        throw lastError || new Error('All call attempts failed');
    };
    return callWithRetry();
}
exports.payEscrowContract = payEscrowContract;
//# sourceMappingURL=payEscrowModule.js.map