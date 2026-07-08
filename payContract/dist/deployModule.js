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
exports.deployContract = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const paycontract_1 = require("./src/contracts/paycontract");
const scrypt_ts_1 = require("scrypt-ts");
const dotenv = __importStar(require("dotenv"));
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const gn_wallet_1 = require("gn-wallet");
const retries_1 = require("./retries");
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
function getConfirmedUtxos(utxos) {
    return utxos;
}
function genDatas(n, l, fechaInicio) {
    // Verificar compatibilidad de tamaños
    const fechas = [];
    for (let i = 0; i < n; i++) {
        fechas.push(fechaInicio + i * l);
    }
    return fechas;
}
async function deployContract(params) {
    // Validar parámetros esenciales
    if (!process.env.WOC_API_KEY) {
        throw new Error("WOC_API_KEY environment variable is not set");
    }
    const privateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(params.purse || '');
    if (!privateKey) {
        throw new Error("Private key is required");
    }
    const pubKey = (0, scrypt_ts_1.PubKey)(privateKey.publicKey.toHex());
    const woc_api_key = process.env.WOC_API_KEY;
    // Configurar provider y signer
    //const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key);
    const provider = new gn_provider_1.GNProvider(scrypt_ts_1.bsv.Networks.mainnet, woc_api_key, '', {
        bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app'
    });
    const validatePubKey = (key, name) => {
        if (typeof key !== 'string') {
            throw new Error(`${name} debe ser un string`);
        }
        if (key.length !== 66) {
            throw new Error(`${name} longitud inválida (${key.length}), debe ser 66 caracteres`);
        }
        if (!key.startsWith('02') && !key.startsWith('03')) {
            throw new Error(`${name} prefijo inválido (${key.slice(0, 2)}), debe comenzar con 02 o 03`);
        }
        if (!/^[0-9a-fA-F]+$/.test(key)) {
            throw new Error(`${name} contiene caracteres no hexadecimales`);
        }
    };
    validatePubKey(pubKey, 'adminPublicKey');
    validatePubKey(params.ownerPub, 'ownerPub');
    validatePubKey(params.ownerGN, 'ownerGN');
    const address = privateKey.toAddress();
    const allUtxos = await (0, retries_1.withRetries)(() => provider.listUnspent(address)); //await provider.listUnspent(address);
    const confirmedUtxos = getConfirmedUtxos(allUtxos);
    if (confirmedUtxos.length === 0) {
        throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
    }
    const signer = new gn_wallet_1.GNWallet(privateKey, provider, {
        targetUtxos: 1,
        dustLimit: 546,
        cacheTTL: 30000
    });
    const qtyTokens = BigInt(params.qtyT);
    const amountQuarks = BigInt(params.quarks);
    const maxPayments = BigInt(params.n);
    const adminPubKey = pubKey;
    // Generar datas usando la función auxiliar
    const ownerPubKey = scrypt_ts_1.bsv.PublicKey.fromHex(params.ownerPub);
    const ownerAddr = (0, scrypt_ts_1.Addr)(ownerPubKey.toAddress().toByteString());
    const realAddOwner = scrypt_ts_1.bsv.Address.fromPublicKey(ownerPubKey).toString();
    // Preparar claves y direcciones
    const gnPubKey = scrypt_ts_1.bsv.PublicKey.fromHex(params.ownerGN);
    const gnAddr = (0, scrypt_ts_1.Addr)(gnPubKey.toAddress().toByteString());
    const realAddGN = scrypt_ts_1.bsv.Address.fromPublicKey(gnPubKey).toString();
    // ----------------------------------------------------------------------
    // 4. MAGIA DEL LEDGER BINARIO: Construcción del Arreglo Stringified
    // ----------------------------------------------------------------------
    const scheduledDates = genDatas(params.n, params.lapse, params.startDate);
    const totalBuffer = Buffer.alloc(params.n * 56); // 56 bytes por slot
    for (let i = 0; i < params.n; i++) {
        const offset = i * 56;
        // Escribir scheduledDate (8 bytes - Little Endian nativo de JS/sCrypt)
        totalBuffer.writeBigInt64LE(BigInt(scheduledDates[i]), offset);
        // Escribir realTimestamp inicial (8 bytes en 0)
        totalBuffer.writeBigInt64LE(0n, offset + 8);
        // Escribir txid vacío (32 bytes de ceros)
        totalBuffer.fill(0, offset + 16, offset + 48);
        // Escribir qtyPago inicial (8 bytes en 0)
        totalBuffer.writeBigInt64LE(0n, offset + 48);
    }
    const initialLedger = (0, scrypt_ts_1.toByteString)(totalBuffer.toString('hex'));
    // ----------------------------------------------------------------------
    // 5. Carga de Artefacto e Instanciación
    // ----------------------------------------------------------------------
    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artefacto no encontrado en: ${artifactPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await paycontract_1.PaymentContract.loadArtifact(artifact);
    // 2. Crea instancia con parámetros dinámicos
    const contract = new paycontract_1.PaymentContract(ownerAddr, adminPubKey, gnAddr, amountQuarks, qtyTokens, maxPayments, initialLedger);
    // 3. Conecta a la blockchain
    await contract.connect(signer);
    // 4. Despliega y retorna resultado directo
    const deployTx = await (0, retries_1.withRetries)(async () => {
        await contract.connect(signer);
        return await contract.deploy(1, { utxos: confirmedUtxos });
    });
    /*await contract.deploy(1, {
          utxos: confirmedUtxos
      });*/
    return {
        contractId: deployTx.id,
        state: contract.paymentsLedger, // Retorna la cadena Hex completa del ledger
        addressOwner: realAddOwner,
        addressGN: realAddGN,
        paymentQuarks: contract.amountGN.toString()
    };
}
exports.deployContract = deployContract;
//# sourceMappingURL=deployModule.js.map