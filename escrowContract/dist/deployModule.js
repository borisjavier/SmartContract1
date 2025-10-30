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
exports.deployEscrowContract = deployEscrowContract;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const escrowcontract_1 = require("./src/contracts/escrowcontract");
const scrypt_ts_1 = require("scrypt-ts");
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const dotenv = __importStar(require("dotenv"));
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
const amount = 100;
function getPrivateKey(attempt) {
    if (attempt < 3) {
        if (!process.env.PRIVATE_KEY) {
            throw new Error("No \"PRIVATE_KEY\" found in .env");
        }
        return scrypt_ts_1.bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY);
    }
    else {
        if (!process.env.PRIVATE_KEY_2) {
            throw new Error("No \"PRIVATE_KEY_2\" found in .env for final attempt");
        }
        return scrypt_ts_1.bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY_2);
    }
}
function getConfirmedUtxos(utxos) {
    return utxos.filter(utxo => utxo.height >= 0);
}
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
    await escrowcontract_1.Escrowcontract.loadArtifact(artifact);
    // Configurar provider
    const provider = new gn_provider_1.GNProvider(scrypt_ts_1.bsv.Networks.mainnet, process.env.WOC_API_KEY);
    // Convertir public keys a formato de contrato
    const pubKeys = params.publicKeys.map(pk => (0, scrypt_ts_1.PubKey)(pk));
    const addresses = pubKeys.map(pk => (0, scrypt_ts_1.Addr)((0, scrypt_ts_1.hash160)(pk)));
    // Función interna para reintentos
    const deployWithRetry = async (attempts = 3, delay = 3000) => {
        let lastError = null;
        for (let i = 0; i < attempts; i++) {
            try {
                const privateKey = getPrivateKey(i);
                const keyUsed = i < 2 ? 'PRIVATE_KEY' : 'PRIVATE_KEY_2';
                const address = privateKey.toAddress();
                const allUtxos = await provider.listUnspent(address);
                const confirmedUtxos = getConfirmedUtxos(allUtxos);
                if (confirmedUtxos.length === 0) {
                    throw new Error("No confirmed UTXOs available for deployment");
                }
                const signer = new scrypt_ts_1.TestWallet(privateKey, provider);
                const contract = new escrowcontract_1.Escrowcontract(addresses, params.lockTimeMin);
                await contract.connect(signer);
                const deployTx = await contract.deploy(amount, {
                    utxos: confirmedUtxos
                });
                return {
                    txId: deployTx.id,
                    keyUsed: keyUsed
                };
            }
            catch (error) {
                lastError = error;
                console.error(`Attempt ${i + 1} failed: ${error.message}`);
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
//# sourceMappingURL=deployModule.js.map