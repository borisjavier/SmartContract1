import { PaymentContract, Timestamp, N } from './src/contracts/paycontract';
import { bsv, DefaultProvider, TestWallet, PubKey, Addr, ByteString, FixedArray, toByteString, fill } from 'scrypt-ts';
import { adminPublicKey } from './config';
import * as dotenv from 'dotenv';
dotenv.config();

// Tipos para parámetros
export type DeployParams = {
    qtyT: number;
    lapse: number;
    startDate: number;
    ownerPub: string;
    ownerGN: string;
    quarks: number;
};
/**
 *     adminPublicKey: string;
    privateKey: string;
 */

const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '');

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



export async function deployContract(params: DeployParams): Promise<DeploymentResult> {
    //console.log('En deployModule los params recibidos son: ', JSON.stringify(params, null, 2));
    // Validar parámetros esenciales
    if (!privateKey) {
        throw new Error("Private key is required");
    } 
    if (!adminPublicKey) {
        throw new Error("Admin public key is required");
    } 

    // Validar formato de claves públicas
    /*const validatePubKey = (key: string) => {
        if (!key.startsWith('02') && !key.startsWith('03') || key.length !== 66) {
            throw new Error(`Clave pública inválida: ${key}`);
        }
    };*/
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

    //validatePubKey(params.adminPublicKey);
    //validatePubKey(params.ownerPub);
    //validatePubKey(params.ownerGN);

    validatePubKey(adminPublicKey, 'adminPublicKey');
    validatePubKey(params.ownerPub, 'ownerPub');
    validatePubKey(params.ownerGN, 'ownerGN');
    
    // Configurar provider y signer
    const provider = new DefaultProvider({ network: bsv.Networks.mainnet });

    const signer = new TestWallet(privateKey, provider);

    // Generar datas usando la función auxiliar
    const datas = await genDatas(N, params.lapse, params.startDate);

    // Configurar valores iniciales
    const emptyTxid = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
    const txids: FixedArray<ByteString, typeof N> = fill(emptyTxid, N);

    // Preparar claves y direcciones
    const adminPubKey = PubKey(adminPublicKey);
    const ownerPubKey = bsv.PublicKey.fromHex(params.ownerPub);
    const ownerAddr = Addr(ownerPubKey.toAddress().toByteString());
    const gnPubKey = bsv.PublicKey.fromHex(params.ownerGN);
    const gnAddr = Addr(gnPubKey.toAddress().toByteString());
    const realAddGN = bsv.Address.fromPublicKey(gnPubKey).toString();
    const realAddOwner = bsv.Address.fromPublicKey(ownerPubKey).toString();
    
    // 1. Carga el artefacto COMPILADO (sin ts-node)
    await PaymentContract.loadArtifact();
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
  const deployTx = await contract.deploy(1);
  
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
                
                const fechas: FixedArray<Timestamp, typeof N> = fill(0n, N);
                console.log('fechas antes de: ', fechas)

                for (let i = 0; i < n; i++) {
                    const fecha = BigInt(fechaInicio + i * l);
                    console.log('fecha: ', fecha)
                    fechas[i] = BigInt(fecha);
                }

                console.log('fechas después de: ', fechas);

                return fechas;
            }




