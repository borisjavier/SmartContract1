/*
ARCHIVO DISEÑADO PARA PAYCONTRACT SMART CONTRACT
*/ 
const { exec } = require('child_process'); // Carga de módulos con require para CommonJS
const path = require('path');
const fs = require('fs').promises; // Acceso a fs.promises para funciones async
const createAndCompileAndDeploy = require('./deployContract');
const { Mutex } = require('async-mutex');
const mutex = new Mutex();



const contractDir = path.resolve(__dirname, './payContract'); 

// Ruta al directorio de contratos dentro de `payContracto`
const contractsPath = path.resolve(contractDir, 'src', 'contracts');

async function generateContracts(size) {
//for (let i = 1; i <= 5; i++) {
    const contractCode = generateContract(size);  // Supón que `generateContract(i)` genera el código del contrato basado en `i`
    const contractFileName = `paycontract.ts`;
    const contractPath = path.resolve(contractsPath, contractFileName);

    try {
    // Abrir el archivo con permisos de escritura ('w' sobreescribe si ya existe)
    const fileHandle = await fs.open(contractPath, 'w');
    
    // Escribir el contenido del contrato en el archivo
    await fileHandle.write(contractCode);
    
    // Cerrar el archivo
    await fileHandle.close();
    
    console.log(`Archivo de contrato ${contractFileName} sobreescrito correctamente.`);
    //await cleanUpGeneratedFiles();
    ///    
    //await fs.writeFile(contractPath, contractCode);
    //console.log(`Archivo de contrato ${contractFileName} creado correctamente.`);
    } catch (error) {
    console.error(`Error al crear el archivo ${contractFileName}: ${error.message}`);
    throw new Error(`Error al crear el contrato: ${error.message}`);
    }
//}
}

async function compileContracts() {
return new Promise((resolve, reject) => {
    exec(`npx scrypt-cli compile`, { cwd: contractDir }, (err, stdout, stderr) => {
    if (err) {
        console.error(`Error al compilar: ${stderr}`);
        reject(`Error al compilar los contratos: ${stderr}`);
    } else {
        console.log(`Compilación exitosa: ${stdout}`);
        resolve(stdout);
    }
    });
});
}

// Función que genera el contrato dinámico en TypeScript
function generateContract(size) {
  return `
  import {
  SmartContract,
  method,
  prop,
  assert,
  PubKey,
  Sig,
  Addr,
  hash256,
  ByteString,
  FixedArray,
  toByteString,
  fill
} from 'scrypt-ts';

export type Timestamp = bigint
export type TxId = ByteString

export type Payment = {
  timestamp: Timestamp
  txid: TxId
}

export const N = ${size}

export type Payments = FixedArray<Payment, typeof N>


export class PaymentContract extends SmartContract {
  @prop(true)
  owner: Addr;

  @prop()
  readonly adminPubKey: PubKey;

  @prop(true)
  addressGN: Addr;

  @prop(true)
  amountGN: bigint;

  @prop(true)
  qtyTokens: bigint;

  @prop(true)
  dataPayments: Payments;

  @prop(true)
  isValid: boolean;

  @prop(true)
  isOwner: boolean;

  @prop()
  readonly EMPTY: TxId;


  constructor(
      owner: Addr,
      adminPubKey: PubKey,
      addressGN: Addr,
      amountGN: bigint,
      qtyTokens: bigint,
      datas: FixedArray<Timestamp, typeof N>,
      txids: FixedArray<ByteString, typeof N>
  ) {
      super(...arguments);
      this.owner = owner;
      this.adminPubKey = adminPubKey;
      this.addressGN = addressGN;
      this.amountGN = amountGN;
      this.qtyTokens = qtyTokens;
      this.dataPayments = fill({
          timestamp: 0n,
          txid: toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836')
      }, N);
      for (let i = 0; i < N; i++) {
          this.dataPayments[i] = {
              timestamp: datas[i],
              txid: txids[i]
          }
      }
      this.isValid = true;
      this.isOwner = true;
      this.EMPTY = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'); //'0' is not a valid hex so I took this old useless transaction as a zero value
  }

  @method()
  public pay(    
      signature: Sig, 
      publicKey: PubKey,
      currentDate: bigint,
      txIdPago: ByteString
  ) {

      assert(this.checkSig(signature, publicKey), 'Signature verification failed')

      assert(this.isValid, 'Contract paid. No longer valid.'); 

      this.updateArr(currentDate, txIdPago)
      
      let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
      if (this.changeAmount > 0n) {
          outputs += this.buildChangeOutput()
      }
      this.debug.diffOutputs(outputs);
      assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
  }

  @method()
  updateArr(currentDate: Timestamp, txid: TxId): void {

      for (let i = 0; i < N; i++) {
          
          if(this.dataPayments[i].timestamp < currentDate && this.dataPayments[i].txid == this.EMPTY) {
          if (i === N - 1) {
              this.isValid = false;
          }
          this.dataPayments[i] = {
              timestamp: currentDate,
              txid: txid
          }
          }
      }
  }


  
  @method() 
  public transferOwnership( 
      signature: Sig, 
      publicKey: PubKey,
      oldOwner: Addr,
      newOwner: Addr,
      newAddressGN: Addr
  ) {
      // admin verification
      assert(this.checkSig(signature, publicKey), 'Signature verification failed')

      //verify owner
      this.verifyId(oldOwner);
      assert(this.isOwner, \`Not the owner of this contract\`)
      // contract is still valid
      assert(this.isValid, 'Contract is no longer valid');

      this.owner = newOwner;//must validate identity in a different contract
      this.addressGN = newAddressGN;


      //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
      let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
      if (this.changeAmount > 0n) {
          outputs += this.buildChangeOutput()
      }
      this.debug.diffOutputs(outputs);
      assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
  }

  @method() 
  public transferPartial( 
      signature: Sig, 
      publicKey: PubKey,
      oldOwner: Addr,
      newAmountGN: bigint,
      newQtyTokens: bigint
  ) {
      // admin verification
      assert(this.checkSig(signature, publicKey), 'Signature verification failed');

      //verify owner
      this.verifyId(oldOwner);
      assert(this.isOwner, \`Not the owner of this contract\`)

      // contract is still valid
      assert(this.isValid, 'Contract is no longer valid');

      this.amountGN = newAmountGN;
      this.qtyTokens = newQtyTokens;


      //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
      let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
      if (this.changeAmount > 0n) {
          outputs += this.buildChangeOutput()
      }
      this.debug.diffOutputs(outputs);
      assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
  }

  @method()
  verifyId(owner: Addr): void {
      this.isOwner = (this.owner == owner)? true: false;
  }

}

`;
}

async function createCompileAndDeploy(size, qtyTokens, lapse, startDate, ownerPubKey, ownerGNKey, quarks) {
  try {
      // 1. Crear los contratos
      await generateContracts(size);

      // 2. Compilar los contratos
      await compileContracts();
      console.log('Contratos compilados exitosamente.');

      // 3. Desplegar el contrato compilado
      console.log('Desplegando el contrato...');
      await createAndCompileAndDeploy(qtyTokens, lapse, startDate, ownerPubKey, ownerGNKey, quarks);
      console.log('Contrato desplegado exitosamente.');
  } catch (error) {
      console.error(`Error en el proceso: ${error.message}`);
      throw error;
  }
}



async function runContract(size, tokens, lapso, start, pubOwner, pubGN, quarks) {
  // Adquiere el mutex
  const release = await mutex.acquire();
  try {
      await createCompileAndDeploy(size, tokens, lapso, start, pubOwner, pubGN, quarks).then(() => {
        console.log('Proceso completado exitosamente.');
      }).catch((error) => {
        console.error('Error en el proceso de creación, compilación o despliegue:', error);
      });
  } finally {
      // Libera el mutex
      release();
  }
}



module.exports = runContract;

/*
runContract(5, 5000, 60, 1726598373, 
  '02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db', 
  '02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc', 
  2125)
Arguments
5,                 // Tamaño del contrato
    5000,              // Tokens
    60,                // Intervalo de tiempo entre transacciones
    1726598373,        // Fecha de inicio (timestamp)
    '02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db',  // Clave pública del dueño
    '02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc',  // Clave pública de la GN del dueño
    2125              // Quarks
*/


/*sample 
createCompileAndDeploy(
  5,                 // Tamaño del contrato
  5000,              // Tokens
  60,                // Intervalo de tiempo entre transacciones
  1726598373,        // Fecha de inicio (timestamp)
  '02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db',  // Clave pública del dueño
  '02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc',  // Clave pública de la GN del dueño
  2125              // Quarks
).then(() => {
  console.log('Proceso completado exitosamente.');
}).catch((error) => {
  console.error('Error en el proceso de creación, compilación o despliegue:', error);
});*/
