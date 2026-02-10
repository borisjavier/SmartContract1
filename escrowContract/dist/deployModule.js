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
exports.deployEscrowContract = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const escrowcontract_1 = require("./src/contracts/escrowcontract");
const scrypt_ts_1 = require("scrypt-ts");
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const retries_1 = require("./retries");
const dotenv = __importStar(require("dotenv"));
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
function getConfirmedUtxos(utxos) {
    return utxos;
}
const woc_api_key = process.env.WOC_API_KEY;
if (!woc_api_key) {
    throw new Error('No "WOC_API_KEY" found in .env file');
}
const network = scrypt_ts_1.bsv.Networks.mainnet; // o bsv.Networks.testnet
//const provider = new GNProvider(network, woc_api_key)
const provider = new gn_provider_1.GNProvider(network, woc_api_key, '', {
    bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app',
});
const amount = 100;
function validatePublicKeys(publicKeys) {
    if (!Array.isArray(publicKeys) || publicKeys.length !== escrowcontract_1.SIGS) {
        throw new Error(`publicKeys must be an array of exactly ${escrowcontract_1.SIGS} elements`);
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
async function deployEscrowContract(params) {
    const privateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(params.contractPK); //bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '');
    validatePublicKeys(params.publicKeys);
    // Cargar artefacto
    const artifactPath = path.resolve(__dirname, '../artifacts/escrowcontract.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at: ${artifactPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await escrowcontract_1.Escrowcontract.loadArtifact(artifact);
    // Configurar provider
    //const provider = new GNProvider(bsv.Networks.mainnet, process.env.WOC_API_KEY);
    // Convertir public keys a formato de contrato
    const pubKeys = params.publicKeys.map((pk) => (0, scrypt_ts_1.PubKey)(pk));
    const addresses = pubKeys.map((pk) => (0, scrypt_ts_1.Addr)((0, scrypt_ts_1.hash160)(pk)));
    // Función interna para reintentos
    const deployWithRetry = async (attempts = 4, delay = 3000) => {
        let lastError = null;
        for (let i = 0; i < attempts; i++) {
            try {
                const address = privateKey.toAddress();
                const allUtxos = await (0, retries_1.withRetries)(() => provider.listUnspent(address)); //await provider.listUnspent(address)
                const confirmedUtxos = getConfirmedUtxos(allUtxos);
                if (confirmedUtxos.length === 0) {
                    throw new Error('No confirmed UTXOs available for deployment');
                }
                const signer = new scrypt_ts_1.TestWallet(privateKey, provider);
                const contract = new escrowcontract_1.Escrowcontract(addresses, params.lockTimeMin);
                await contract.connect(signer);
                const deployTx = await (0, retries_1.withRetries)(async () => {
                    await contract.connect(signer);
                    return await contract.deploy(amount, {
                        utxos: confirmedUtxos,
                    });
                });
                /*await contract.deploy(amount, {
                    utxos: confirmedUtxos,
                })*/
                return {
                    txId: deployTx.id,
                };
            }
            catch (error) {
                lastError = error;
                console.error(`Attempt ${i + 1} failed: ${error.message}`);
                if (i < attempts - 1) {
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    delay *= 2; // Backoff exponencial
                }
            }
        }
        throw lastError || new Error('All deployment attempts failed');
    };
    return deployWithRetry();
}
exports.deployEscrowContract = deployEscrowContract;
//# sourceMappingURL=deployModule.js.map