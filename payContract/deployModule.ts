import * as path from 'path';
import * as fs from 'fs';
import { PaymentContract, Timestamp, N } from './src/contracts/paycontract';
import { bsv, TestWallet, PubKey, Addr, ByteString, FixedArray, toByteString, fill, UTXO } from 'scrypt-ts';
import { adminPublicKey } from './config';
import * as dotenv from 'dotenv';
import { GNProvider } from 'scrypt-ts/dist/providers/gn-provider';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Tipos para parámetros
export type DeployParams = {
    n: number;
    qtyT: number;
    lapse: number;
    startDate: number;
    ownerPub: string;
    ownerGN: string;
    quarks: number;
    purse: string;
};





export type PaymentStateItem = {
    timestamp: string;  // BigInt serializado como string
    txid: string;
};

// Tipo para el array completo
export type PaymentState = PaymentStateItem[];//FixedArray<PaymentStateItem[], typeof N>;

export type DeploymentResult = {
    contractId: string;
    state: PaymentState;  // Tipo específico según tu contrato
    addressOwner: string;
    addressGN: string;
    paymentQuarks: bigint;
};

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos
}



export async function deployContract(params: DeployParams): Promise<DeploymentResult> {
    // Validar parámetros esenciales
    if (!process.env.WOC_API_KEY) {
        throw new Error("WOC_API_KEY environment variable is not set");
    }

    const privateKey = bsv.PrivateKey.fromWIF(params.purse || '');
    if (!privateKey) {
        throw new Error("Private key is required");
    } 
    if (!adminPublicKey) {
        throw new Error("Admin public key is required");
    } 

    const validatePubKey = (key: string, name: string) => {
    if (typeof key !== 'string') {
        throw new Error(`${name} debe ser un string`);
    }
    
    if (key.length !== 66) {
        throw new Error(`${name} longitud inválida (${key.length}), debe ser 66 caracteres`);
    }
    
    if (!key.startsWith('02') && !key.startsWith('03')) {
        throw new Error(`${name} prefijo inválido (${key.slice(0,2)}), debe comenzar con 02 o 03`);
    }
    
    if (!/^[0-9a-fA-F]+$/.test(key)) {
        throw new Error(`${name} contiene caracteres no hexadecimales`);
    }
};


    validatePubKey(adminPublicKey, 'adminPublicKey');
    validatePubKey(params.ownerPub, 'ownerPub');
    validatePubKey(params.ownerGN, 'ownerGN');
    const woc_api_key = process.env.WOC_API_KEY;
    // Configurar provider y signer
    const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key);

    const address = privateKey.toAddress(); 

    const allUtxos = await provider.listUnspent(address);
    const confirmedUtxos = getConfirmedUtxos(allUtxos);

    if (confirmedUtxos.length === 0) {
        throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
    }

    const signer = new TestWallet(privateKey, provider);

    // Generar datas usando la función auxiliar
    const datas = await genDatas(params.n, params.lapse, params.startDate);

    // Configurar valores iniciales
    const emptyTxid = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
    const txids = fill(emptyTxid, params.n) as unknown as FixedArray<ByteString, typeof N>;

    // Preparar claves y direcciones
    const adminPubKey = PubKey(adminPublicKey);
    const ownerPubKey = bsv.PublicKey.fromHex(params.ownerPub);
    const ownerAddr = Addr(ownerPubKey.toAddress().toByteString());
    const gnPubKey = bsv.PublicKey.fromHex(params.ownerGN);
    const gnAddr = Addr(gnPubKey.toAddress().toByteString());
    const realAddGN = bsv.Address.fromPublicKey(gnPubKey).toString();
    const realAddOwner = bsv.Address.fromPublicKey(ownerPubKey).toString();
    
    // 1. Carga el artefacto COMPILADO (sin ts-node)
    // 1. Cargar artefacto usando ruta absoluta
    const artifactPath = path.resolve(__dirname, '../artifacts/paycontract.json');
    
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artefacto no encontrado en: ${artifactPath}`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    await PaymentContract.loadArtifact(artifact);
    // 2. Crea instancia con parámetros dinámicos
    const contract = new PaymentContract(
            ownerAddr,
            adminPubKey,
            gnAddr,
            BigInt(params.quarks),
            BigInt(params.qtyT),
            datas,
            txids
        );

  // 3. Conecta a la blockchain
  await contract.connect(signer);

  // 4. Despliega y retorna resultado directo
  const deployTx = await contract.deploy(1, {
        utxos: confirmedUtxos  
    });
  
  // Preparar resultado
  const serializedState: PaymentState = contract.dataPayments.map(payment => ({
    timestamp: payment.timestamp.toString(),  // Convertir BigInt a string
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

async function genDatas(n: number, l: number, fechaInicio: number): Promise<FixedArray<Timestamp, typeof N>> {
    // Verificar compatibilidad de tamaños
    if (n !== N) {
        throw new Error(
            `Tamaño requerido (${n}) no coincide con tamaño de artefacto (${N}). Detenga el proceso.`
        );
    }
    
    const fechas = fill(0n, N) as FixedArray<bigint, typeof N>;  
    
    for (let i = 0; i < N; i++) {  
        const fecha = BigInt(fechaInicio + i * l);
        fechas[i] = fecha;
    }

    return fechas;
}




