const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { checkCache, restoreArtifacts, getDataPaymentsSize } = require('./utilities');
const { Mutex } = require('async-mutex');
const mutex = new Mutex();


const contractDir = path.resolve(__dirname, './payContract');
const deployFileName = `payScript.ts`;
const deployPath = path.resolve(contractDir, deployFileName);
const resultFilePath = path.resolve(contractDir, 'payResult.json').replace(/\\/g, '/');

async function createAndPay(lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey) {
    try {
        const bigIntArrayDatas = datas.map(num => `${num}n`).join(', ');
        const formattedTxids = JSON.stringify(txids);
        const bigNumberQtyTokens = `${qtyT}n`;

        const deployCode = `
            import { PaymentContract, Timestamp, Payment, N } from './src/contracts/paycontract';
            import { bsv, findSig, DefaultProvider, MethodCallOptions, PubKey, Addr, fill, toByteString, FixedArray, ByteString, TestWallet } from 'scrypt-ts';
            import { promises as fs } from 'fs';
            import * as dotenv from 'dotenv'

                        // Cargar el archivo .env
                        dotenv.config()

                        if (!process.env.PRIVATE_KEY) {
                            throw new Error("No 'PRIVATE_KEY' found in .env, Please run 'npm run genprivkey' to generate a private key")
                        }

            const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '');
            const provider = new DefaultProvider({
                network: bsv.Networks.mainnet,
            });

            const signer = new TestWallet(
                privateKey,
                provider
            )

            function filledTxids(dataPayments, tx0) {
                const n = dataPayments.length;

                if (n === 0 || n === 1) {
                    return false;
                }

                for (let i = 0; i < n - 1; i++) {
                    if (dataPayments[i].txid === tx0) {
                        return false; 
                    }
                }

                return true;
            }

            async function main(txId: string, atOutputIndex = 0) {
                // Clave privada del admin
                const pubKey = PubKey(privateKey.publicKey.toHex());
                const publicKey = privateKey.publicKey;

                const ownerPubKey = bsv.PublicKey.fromHex('${ownerPubKey}');//Alice's Pubkey
                const owner = Addr(ownerPubKey.toAddress().toByteString());
                const currentDate: bigint = BigInt(Math.floor(Date.now() / 1000));
                const tx0 = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
                //
            
                const txIdPago = toByteString('${txidPago}');//obtida da publicação da transação GN
                await PaymentContract.loadArtifact()

                
                const txResponse = await provider.getTransaction('${lastStateTxid}');
                
                const instance = PaymentContract.fromTx(txResponse, atOutputIndex)
                await instance.connect(signer); //getDefaultSigner(privateKey)
                
                const datas: FixedArray<Timestamp, typeof N> = [${bigIntArrayDatas}];
            
                //console.log('datas: ', datas)
                const txids: FixedArray<ByteString, typeof N> = ${formattedTxids}

                let isValid: boolean = true;
                //console.log('txids: ', txids)
                const dataPayments: FixedArray<Payment, typeof N> = fill({ timestamp: 0n, txid: tx0 }, N);


                for (let i = 0; i < N; i++) {
                    dataPayments[i] = {
                        timestamp: datas[i],
                        txid: txids[i],
                    }
                }
                for (let i = 0; i < N; i++) {
                    dataPayments[i] = {
                        timestamp: datas[i],
                        txid: txids[i],
                    }
                    if(dataPayments[i].timestamp < currentDate && dataPayments[i].txid == tx0) {
                        console.log(dataPayments[i].timestamp + 'es menor que currentDate y ' + dataPayments[i].txid + ' es igual a tx0')
                        if (i === N - 1 && filledTxids(dataPayments, tx0)) {
                            isValid = false; // Cambiar isValid a false
                            console.log("El último elemento ha sido modificado, isValid ahora es false.");
                        }

                        dataPayments[i] = {
                            timestamp: currentDate,
                            txid: txIdPago,
                        }
                        break;
                    } else {
                        console.log(dataPayments[i].timestamp + ' no es menor que currentDate o bien ' + dataPayments[i].txid + ' no es igual a tx0')
                    }
                }
                console.log('dataPayments desde call.ts: ', dataPayments);
                console.log('isValid: ', isValid); // Imprimir el estado final de isValid
                const qtyTokens: bigint = ${bigNumberQtyTokens}
                
                try {
                    const nextInstance = instance.next();
                    nextInstance.owner = owner;
                    nextInstance.dataPayments = dataPayments;
                    nextInstance.qtyTokens = qtyTokens;
                    nextInstance.isValid = isValid;
                    const callContract = async () => instance.methods.pay(
                        // findSigs filtra las firmas relevantes
                        (sigResp) => findSig(sigResp, publicKey),
                        pubKey,
                        currentDate,
                        txIdPago,
                        {
                            next: {
                                instance: nextInstance,
                                balance: 1,
                            },

                            pubKeyOrAddrToSign: publicKey,
                        } as MethodCallOptions<PaymentContract>
                    );
                
                    const { tx: unlockTx } = await callContract();
                    
                    const result = {
                    lastStateTxid: unlockTx.id,
                    state: nextInstance.dataPayments,
                    addressGN: nextInstance.addressGN,
                    amountGN: nextInstance.amountGN,
                    isValid: nextInstance.isValid
                    };
                    
                    console.log('Contract unlocked, transaction ID:', unlockTx.id);
                    console.log('State: ' + JSON.stringify(nextInstance.dataPayments))
                    console.log('We will pay ' + nextInstance.amountGN + ' quarks to quarksownerGN: ' + JSON.stringify(nextInstance.addressGN) )
                    await cleanResultFile('${resultFilePath}', result);
                    
                } catch (error) {
                    if (error.message.includes('txn-mempool-conflict')) {
                        console.log('Mempool conflict detected. Retrying after 5 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos
                        const nextInstance = instance.next();
                        nextInstance.owner = owner;
                        nextInstance.dataPayments = dataPayments;
                        nextInstance.qtyTokens = qtyTokens;
                        nextInstance.isValid = isValid;
                        const callContract = async () => instance.methods.pay(
                            // findSigs filtra las firmas relevantes
                            (sigResp) => findSig(sigResp, publicKey),
                            pubKey,
                            currentDate,
                            txIdPago,
                            {
                                next: {
                                    instance: nextInstance,
                                    balance: 1,
                                },

                                pubKeyOrAddrToSign: publicKey,
                            } as MethodCallOptions<PaymentContract>
                        );
                    
                        const { tx: unlockTx } = await callContract();
                        
                        const result = {
                        lastStateTxid: unlockTx.id,
                        state: nextInstance.dataPayments,
                        addressGN: nextInstance.addressGN,
                        amountGN: nextInstance.amountGN,
                        isValid: nextInstance.isValid
                        };
                        
                        console.log('Contract unlocked, transaction ID:', unlockTx.id);
                        console.log('State: ' + JSON.stringify(nextInstance.dataPayments))
                        console.log('We will pay ' + nextInstance.amountGN + ' quarks to quarksownerGN: ' + JSON.stringify(nextInstance.addressGN) )
                        await cleanResultFile('${resultFilePath}', result);
                    } else {
                        console.error('Contract call for payment failed:', error)
                    }

                }


            }

            async function cleanResultFile(resultFilePath: string, result: Record<string, unknown>): Promise<void> {
                try {
                    // Validar si el resultado ya es un JSON válido
                    if (typeof result !== 'object' || result === null) {
                        throw new Error('El resultado proporcionado no es un objeto JSON válido.');
                    }

                     // Borrar el archivo si existe
                     await fs.unlink(resultFilePath).catch(err => {
                        // Si el archivo no existe, ignorar el error
                        if (err.code !== 'ENOENT') {
                            throw err; // Lanzar el error si es otro tipo de error
                        }
                    });
            
                    // Reescribir el archivo con JSON formateado
                    const formattedResult = JSON.stringify(result, null, 2);
                    await fs.writeFile(resultFilePath, formattedResult, 'utf-8');
            
                    console.log('Archivo de resultados limpiado y guardado en: ' + resultFilePath);
                } catch (error) {
                    console.error('Error al limpiar el archivo de resultados: ' + error.message);
                }
            }

            main("${lastStateTxid}").catch(console.error);

        `;  //qtyTokens, lapse, startDate, ownerPubKey, ownerGNKey, quarks

        try {
            await fs.unlink(deployPath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        const fileHandle = await fs.open(deployPath, 'w');
        await fileHandle.write(deployCode);
        await fileHandle.close();
        
        console.log('Archivo payScript.ts actualizado con los nuevos parámetros.');

         
        await new Promise((resolve, reject) => {
            exec('npx ts-node payScript.ts', { cwd: contractDir }, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error al llamar el método pay: ${stderr}`);
                    return reject(new Error('Error en el comando "npx ts-node payScript.ts"'));
                }
                console.log(`Llamado exitoso de payScript.ts: ${stdout}`);
                resolve();  // Resolver la promesa una vez que el despliegue sea exitoso
            });
        });

        try {
            // Comprobar si el archivo existe
            await fs.access(resultFilePath);           
            const resultData = await fs.readFile(resultFilePath, 'utf8');
            console.log(`resultData: ${resultData}`)
            const result = JSON.parse(resultData);
            return result;  // Retornar el resultado para su uso posterior 
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error('El archivo no existe:', resultFilePath);
            } else {
                console.error('Error al leer el archivo:', error);
            }
        }
               
    } catch (error) {
        console.error(`Error en el proceso: ${error.message}`);
        throw error;
    }
}


      async function createPayScriptAndCall(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey) {
        try {
            const sizePresent = await getDataPaymentsSize();
            
            if (sizePresent !== size || sizePresent == null) {
                const isCached = await checkCache(size);
                
                if (isCached) {
                    console.log(`Usando artifacts en caché para size ${size}.`);
                    // Si la caché existe, restaurar los artifacts y el código fuente
                    await restoreArtifacts(size);  // Restaurar los artifacts a la carpeta `artifacts`
                } else {
                    // Si no hay caché, se lanza un error
                    throw new Error(`No artifacts found for contract of size ${size}`);
                }
            }
    
            // Llamar a `createAndPay` para ejecutar el script de pago
            console.log('Llamando payScript...');
            const result = await createAndPay(lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey);
            console.log('Pago registrado exitosamente.');
            return result;
    
        } catch (error) {
            throw new Error(`Error en el proceso: ${error.message}`);
        }
    }
    
    async function runPay(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey) {
        try {
            // Llamar a `createPayScriptAndCall` y esperar el resultado
            const result = await createPayScriptAndCall(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey);
    
            // Verificar que el resultado sea válido
            if (result && typeof result === 'object' && result.lastStateTxid) {
                console.log('Proceso completado exitosamente. Pago efectuado:', JSON.stringify(result, null, 2));
                return result;  // Retorna el resultado para su posterior uso
            } else {
                throw new Error('La respuesta del llamado no es válida o no contiene lastStateTxid.');
            }
    
        } catch (error) {
            console.error('Error en el proceso de creación o llamado:', error.message);
            throw error;  // Propagamos el error para ser manejado en niveles superiores
        }
    }
    

module.exports = runPay;   