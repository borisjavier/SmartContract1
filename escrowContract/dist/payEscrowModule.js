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
exports.payEscrowContract = payEscrowContract;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const escrowcontract_1 = require("./src/contracts/escrowcontract");
const scrypt_ts_1 = require("scrypt-ts");
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const dotenv = __importStar(require("dotenv"));
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
function getConfirmedUtxos(utxos) {
    return utxos.filter(utxo => utxo.height >= 0);
}
function sanitizePrivateKey(key) {
    if (!key)
        throw new Error("Private key is undefined");
    const cleanKey = key.replace(/["';\\\s]/g, '');
    try {
        return scrypt_ts_1.bsv.PrivateKey.fromWIF(cleanKey);
    }
    catch (error) {
        throw new Error(`Invalid private key format: ${cleanKey.substring(0, 6)}...`);
    }
}
async function payEscrowContract(params) {
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
    await escrowcontract_1.Escrowcontract.loadArtifact(artifact);
    // Configurar provider
    const provider = new gn_provider_1.GNProvider(scrypt_ts_1.bsv.Networks.mainnet, process.env.WOC_API_KEY);
    const callWithRetry = async (maxAttempts = 4, initialDelay = 3000) => {
        let lastError = null;
        let delay = initialDelay;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const txResponse = await provider.getTransaction(params.txId);
                // Reconstruir la instancia del contrato desde la transacción existente
                const instance = escrowcontract_1.Escrowcontract.fromTx(txResponse, params.atOutputIndex || 0);
                const deployerPrivateKey = sanitizePrivateKey(process.env[params.deployerKeyType]);
                const additionalKey = sanitizePrivateKey(process.env.PRIVATE_KEY_3);
                if (!additionalKey) {
                    throw new Error("Additional key (PRIVATE_KEY_3) not found in .env");
                }
                const participantPrivateKeys = params.participantKeys.map(wif => {
                    try {
                        return scrypt_ts_1.bsv.PrivateKey.fromWIF(wif);
                    }
                    catch (error) {
                        throw new Error(`Invalid participant key: ${wif.substring(0, 6)}...`);
                    }
                });
                let allPrivateKeys;
                if (params.deployerKeyType === "PRIVATE_KEY") {
                    allPrivateKeys = [
                        deployerPrivateKey, // PRIVATE_KEY (primera)
                        additionalKey, // PRIVATE_KEY_3 (segunda)
                        ...participantPrivateKeys
                    ];
                }
                else if (params.deployerKeyType === "PRIVATE_KEY_2") {
                    allPrivateKeys = [
                        additionalKey, // PRIVATE_KEY_3 (primera)
                        deployerPrivateKey, // PRIVATE_KEY_2 (segunda)
                        ...participantPrivateKeys
                    ];
                }
                else {
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
                const signer = new scrypt_ts_1.TestWallet(allPrivateKeys, provider);
                await instance.connect(signer);
                const { tx: unlockTx } = await instance.methods.pay((sigResps) => (0, scrypt_ts_1.findSigs)(sigResps, publicKeys), publicKeys.map((publicKey) => (0, scrypt_ts_1.PubKey)(publicKey.toByteString())), {
                    pubKeyOrAddrToSign: publicKeys,
                });
                console.log('✅ Escrow contract pay method called successfully: ', unlockTx.id);
                return {
                    txId: unlockTx.id,
                    usedKeyType: params.deployerKeyType
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
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Backoff exponencial
                }
            }
        }
        throw lastError || new Error("All call attempts failed");
    };
    return callWithRetry();
}
//# sourceMappingURL=payEscrowModule.js.map