import * as path from 'path';
import * as fs from 'fs';
import { PaymentContract } from './src/contracts/paycontract';
import { bsv, PubKey, Addr, toByteString, UTXO } from 'scrypt-ts';
import { adminPublicKey } from './config';
import * as dotenv from 'dotenv';
import { GNProvider } from 'scrypt-ts/dist/providers/gn-provider';
import { GNWallet } from 'gn-wallet';
import { withRetries } from './retries';

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

export type DeploymentResult = {
    contractId: string;
    state: string;  // Ahora el estado es simplemente un Hex String (El Ledger Binario)
    addressOwner: string;
    addressGN: string;
    paymentQuarks: string;
};

function getConfirmedUtxos(utxos: UTXO[]): UTXO[] {
    return utxos
}


function genDatas(n: number, l: number, fechaInicio: number): number[] {
    // Verificar compatibilidad de tamaños
    const fechas: number[] = [];
    for (let i = 0; i < n; i++) {
        fechas.push(fechaInicio + i * l);
    }

    return fechas;
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

    const woc_api_key = process.env.WOC_API_KEY;
    // Configurar provider y signer
    //const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key);
    const provider = new GNProvider(bsv.Networks.mainnet, woc_api_key, '', { 
        bridgeUrl: 'https://goldennotes-api-1002383099812.us-central1.run.app' 
    });
    
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
    

    const address = privateKey.toAddress(); 

    const allUtxos = await withRetries(() => provider.listUnspent(address));//await provider.listUnspent(address);
    const confirmedUtxos = getConfirmedUtxos(allUtxos);

    if (confirmedUtxos.length === 0) {
        throw new Error("No hay UTXOs confirmados disponibles para el despliegue");
    }

    const signer = new GNWallet(privateKey, provider, {
                targetUtxos: 50,   
                dustLimit: 546,    
                cacheTTL: 30000    
            });

    const qtyTokens = BigInt(params.qtyT); 
    const amountQuarks = BigInt(params.quarks); 
    const maxPayments = BigInt(params.n);
    const adminPubKey: PubKey = PubKey(adminPublicKey);
    // Generar datas usando la función auxiliar

    const ownerPubKey = bsv.PublicKey.fromHex(params.ownerPub);
    const ownerAddr = Addr(ownerPubKey.toAddress().toByteString());
    const realAddOwner = bsv.Address.fromPublicKey(ownerPubKey).toString();
    // Preparar claves y direcciones

    const gnPubKey = bsv.PublicKey.fromHex(params.ownerGN);
    const gnAddr = Addr(gnPubKey.toAddress().toByteString());
    const realAddGN = bsv.Address.fromPublicKey(gnPubKey).toString();

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

    const initialLedger = toByteString(totalBuffer.toString('hex'));


    // ----------------------------------------------------------------------
    // 5. Carga de Artefacto e Instanciación
    // ----------------------------------------------------------------------
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
            amountQuarks, 
            qtyTokens, 
            maxPayments,
            initialLedger
        );

  // 3. Conecta a la blockchain
  await contract.connect(signer);

  // 4. Despliega y retorna resultado directo
  const deployTx = await withRetries(async () => {
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






