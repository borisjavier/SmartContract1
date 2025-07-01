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
const config_1 = require("./config");
const dotenv = __importStar(require("dotenv"));
const gn_provider_1 = require("scrypt-ts/dist/providers/gn-provider");
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
const privateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '');
function getConfirmedUtxos(utxos) {
    return utxos.filter(utxo => utxo.height > 0);
}
async function deployContract(params) {
    //console.log('En deployModule los params recibidos son: ', JSON.stringify(params, null, 2));
    // Validar parámetros esenciales
    if (!privateKey) {
        throw new Error("Private key is required");
    }
    if (!config_1.adminPublicKey) {
        throw new Error("Admin public key is required");
    }
    // Validar formato de claves públicas
    /*const validatePubKey = (key: string) => {
        if (!key.startsWith('02') && !key.startsWith('03') || key.length !== 66) {
            throw new Error(`Clave pública inválida: ${key}`);
        }
    };*/
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
    //validatePubKey(params.adminPublicKey);
    //validatePubKey(params.ownerPub);
    //validatePubKey(params.ownerGN);
    validatePubKey(config_1.adminPublicKey, 'adminPublicKey');
    validatePubKey(params.ownerPub, 'ownerPub');
    validatePubKey(params.ownerGN, 'ownerGN');
    const woc_api_key = 'mainnet_3a3bcb1b859226f079def02a452cb9a4';
    // Configurar provider y signer
    const provider = new gn_provider_1.GNProvider(scrypt_ts_1.bsv.Networks.mainnet, woc_api_key);
    const address = privateKey.toAddress();
    const allUtxos = await provider.listUnspent(address);
    const confirmedUtxos = getConfirmedUtxos(allUtxos);
    if (confirmedUtxos.length === 0) {
        throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
    }
    const signer = new scrypt_ts_1.TestWallet(privateKey, provider);
    // Generar datas usando la función auxiliar
    const datas = await genDatas(params.n, params.lapse, params.startDate);
    // Configurar valores iniciales
    const emptyTxid = (0, scrypt_ts_1.toByteString)('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
    const txids = (0, scrypt_ts_1.fill)(emptyTxid, params.n);
    // Preparar claves y direcciones
    const adminPubKey = (0, scrypt_ts_1.PubKey)(config_1.adminPublicKey);
    const ownerPubKey = scrypt_ts_1.bsv.PublicKey.fromHex(params.ownerPub);
    const ownerAddr = (0, scrypt_ts_1.Addr)(ownerPubKey.toAddress().toByteString());
    const gnPubKey = scrypt_ts_1.bsv.PublicKey.fromHex(params.ownerGN);
    const gnAddr = (0, scrypt_ts_1.Addr)(gnPubKey.toAddress().toByteString());
    const realAddGN = scrypt_ts_1.bsv.Address.fromPublicKey(gnPubKey).toString();
    const realAddOwner = scrypt_ts_1.bsv.Address.fromPublicKey(ownerPubKey).toString();
    // 1. Carga el artefacto COMPILADO (sin ts-node)
    // 1. Cargar artefacto usando ruta absoluta
    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artefacto no encontrado en: ${artifactPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await paycontract_1.PaymentContract.loadArtifact(artifact);
    // 2. Crea instancia con parámetros dinámicos
    const contract = new paycontract_1.PaymentContract(ownerAddr, adminPubKey, gnAddr, BigInt(params.quarks), BigInt(params.qtyT), datas, txids);
    // 3. Conecta a la blockchain
    await contract.connect(signer);
    // 4. Despliega y retorna resultado directo
    const deployTx = await contract.deploy(1, {
        utxos: confirmedUtxos
    });
    // Preparar resultado
    const serializedState = contract.dataPayments.map(payment => ({
        timestamp: payment.timestamp.toString(), // Convertir BigInt a string
        txid: payment.txid
    }));
    return {
        contractId: deployTx.id,
        state: serializedState,
        addressOwner: realAddOwner, //ownerPubKey.toAddress().toString(), //bsv.Address.fromPublicKey(ownerPubKey).toString();
        addressGN: realAddGN, //gnPubKey.toAddress().toString(), 
        paymentQuarks: contract.amountGN
    };
}
exports.deployContract = deployContract;
/*async function genDatas(n: number, l: number, fechaInicio: number): Promise<FixedArray<Timestamp, typeof N>> {
              if(n == N) {
                const fechas = fill(0n, n) as unknown as FixedArray<Timestamp, typeof N>;
                console.log('fechas antes de: ', fechas)

                for (let i = 0; i < n; i++) {
                    const fecha = BigInt(fechaInicio + i * l);
                    console.log('fecha: ', fecha)
                    fechas[i] = BigInt(fecha);
                }

                console.log('fechas después de: ', fechas);

                return fechas;
              } else {
                throw new Error(`Tamaño requerido (${n}) no coincide con tamaño de artefacto (${N}). Detenga el proceso.`)
              }
                
            }*/
async function genDatas(n, l, fechaInicio) {
    // Verificar compatibilidad de tamaños
    if (n !== paycontract_1.N) {
        throw new Error(`Tamaño requerido (${n}) no coincide con tamaño de artefacto (${paycontract_1.N}). Detenga el proceso.`);
    }
    const fechas = (0, scrypt_ts_1.fill)(0n, paycontract_1.N);
    for (let i = 0; i < paycontract_1.N; i++) {
        const fecha = BigInt(fechaInicio + i * l);
        fechas[i] = fecha;
    }
    return fechas;
}
//# sourceMappingURL=deployModule.js.map