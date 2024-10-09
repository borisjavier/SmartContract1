/*
ARCHIVO DISEÑADO PARA PAYCONTRACT SMART CONTRACT
*/ 
const { exec } = require('child_process'); // Carga de módulos con require para CommonJS
const path = require('path');
const fs = require('fs').promises; // Acceso a fs.promises para funciones async
const createAndCompileAndDeploy = require('./deployContract');
const { checkCache, restoreArtifacts } = require('./utilities')
const { Mutex } = require('async-mutex');
const mutex = new Mutex();



const contractDir = path.resolve(__dirname, './payContract'); 
const cacheDir = path.resolve(__dirname, './cache'); 


// Ruta al directorio de contratos dentro de `payContract`
const contractsPath = path.resolve(contractDir, 'src', 'contracts');

async function generateContracts(size) {

    const contractCode = generateContract(size);  
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

    } catch (error) {
    console.error(`Error al crear el archivo ${contractFileName}: ${error.message}`);
    throw new Error(`Error al crear el contrato: ${error.message}`);
    }
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
          let done = true;

          for (let i = 0; i < N; i++) {
              if (done && this.dataPayments[i].timestamp < currentDate && this.dataPayments[i].txid === this.EMPTY) {
                  if (i === N - 1 && this.filledTxids(this.dataPayments)) {
                      this.isValid = false;
                  }
                  this.dataPayments[i] = {
                      timestamp: currentDate,
                      txid: txid
                  };
                  done = false;
              }
          }
      }
      

@method()
filledTxids(dataPayments: Payments): boolean {
    let allFilled = true;
    let done = true;

    if (N < 1) {
        allFilled = false;
    }

    for (let i = 0; i < N - 1; i++) {
        if (done && dataPayments[i].txid === this.EMPTY) {
            allFilled = false;
            done = false;
        }
    }

    assert(allFilled, 'Some txids are still empty');

    return allFilled;  
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
      assert(this.isOwner, 'Not the owner of this contract')
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
      assert(this.isOwner, 'Not the owner of this contract')

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

  async function saveArtifacts(size) {
    const artifacts = ['paycontract.json', 'paycontract.scrypt', 'paycontract.scrypt.map', 'paycontract.transformer.json'];
    const cachePath = path.resolve(cacheDir, `paycontract_${size}`);
  
    try {
      // Crear la carpeta de caché si no existe
      await fs.mkdir(cachePath, { recursive: true });
      for (const file of artifacts) {
        const srcPath = path.resolve(contractDir, `artifacts/${file}`);
        const destPath = path.resolve(cachePath, file);
        await fs.copyFile(srcPath, destPath);  // Copiar los archivos generados a la carpeta de caché
        console.log(`Artifact ${file} guardado en la caché.`);
      }
      // Guardar el archivo paycontract.ts desde `contractDir/src/contracts`
        const contractFile = 'paycontract.ts';
        const contractSrcPath = path.resolve(contractDir, 'src', 'contracts', contractFile);  // Ruta origen del contrato fuente
        const contractDestPath = path.resolve(cachePath, contractFile);                       // Ruta destino en la caché
        await fs.copyFile(contractSrcPath, contractDestPath);  // Copiar el archivo paycontract.ts a la caché
        console.log(`Archivo ${contractFile} guardado en la caché para size ${size}.`);
        } catch (error) {
        console.error(`Error al guardar los artifacts en la caché: ${error.message}`);
        throw error;
        }
  }

async function createCompileAndDeploy(size, qtyTokens, lapse, startDate, ownerPubKey, ownerGNKey, quarks) {
  try {
    const isCached = await checkCache(size);
        if (isCached) {
        console.log(`Usando artifacts en caché para size ${size}.`);
            //1 y 2 Si la cache existe, pega los artefactos y el código fuetne
        await restoreArtifacts(size);  // Restaurar los artifacts a la carpeta `artifacts`
        } else {
            // 1. Crear los contratos
        await generateContracts(size);

        // 2. Compilar los contratos
        await compileContracts();
        console.log('Contratos compilados exitosamente.');
        // 3. Salvar los artefactos
        await saveArtifacts(size);
        }
      

      // 4. Desplegar el contrato compilado
      console.log('Desplegando el contrato...');
      const result = await createAndCompileAndDeploy(qtyTokens, lapse, startDate, ownerPubKey, ownerGNKey, quarks);
      console.log('Contrato desplegado exitosamente.');
      return result;

  } catch (error) {
      console.error(`Error en el proceso: ${error.message}`);
      throw error;
  }
}



async function runContract(size, tokens, lapso, start, pubOwner, pubGN, quarks) {
  // Adquiere el mutex
  const release = await mutex.acquire();
  try {
    // Llamamos a `createCompileAndDeploy` y esperamos el resultado
    const result = await createCompileAndDeploy(size, tokens, lapso, start, pubOwner, pubGN, quarks);

    // Verificamos que el resultado sea un objeto válido
    if (result && typeof result === 'object' && result.contractId) {
        console.log('Proceso completado exitosamente. Contrato desplegado:', JSON.stringify(result, null, 2));
        return result;  // Retorna el resultado para su posterior uso
        } else {
            throw new Error('La respuesta del despliegue no es válida o no contiene un contractId.');
        }
    } catch (error) {
        console.error('Error en el proceso de creación, compilación o despliegue:', error.message);
        throw error;  // Propagamos el error para ser manejado en niveles superiores
    } finally {
        // Liberamos el mutex una vez que el proceso ha terminado, sea exitoso o haya fallado
        release();
    }
}



module.exports = runContract;
