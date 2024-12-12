const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { checkCache, restoreArtifacts, getDataPaymentsSize } = require('./utilities');


const contractDir = path.resolve(__dirname, './payContract');
const deployFileName = `deploy.ts`;
const deployPath = path.resolve(contractDir, deployFileName);
const resultFilePath = path.resolve(contractDir, 'deployResult.json').replace(/\\/g, '/');


async function createDeploy(qtyT, lapse, startDate, ownerPubKey, ownerGNKey, quarks) {
    try {
        const deployCode = `
           import { PaymentContract, Timestamp, N } from './src/contracts/paycontract';
            import { bsv, DefaultProvider, TestWallet, PubKey, Addr, ByteString, FixedArray, toByteString, fill } from 'scrypt-ts';
            import { adminPublicKey } from './config';
            import { promises as fs } from 'fs';

            import * as dotenv from 'dotenv'

            // Cargar el archivo .env
            dotenv.config()

            if (!process.env.PRIVATE_KEY) {
                throw new Error("No 'PRIVATE_KEY' found in .env, Please run 'npm run genprivkey' to generate a private key")
            }

            const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '')
                

            const signer = new TestWallet(
                privateKey,
                new DefaultProvider({
                    network: bsv.Networks.mainnet,
                })
            )

            async function main(qtyT, l, fIn, ownerPub, ownerGN, quarks) {

                const adminPubKey: PubKey = PubKey(adminPublicKey);

                // Parámetros del contrato
                const qtyTokens = BigInt(qtyT); 
                const datas: FixedArray<Timestamp, typeof N> = await genDatas(N, l, fIn)
                const t: ByteString = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
                const txids: FixedArray<ByteString, typeof N> = fill(t, N);

                
                const ownerPubKey = bsv.PublicKey.fromHex(ownerPub);
                const realAddOwner = bsv.Address.fromPublicKey(ownerPubKey).toString();
                const owner = Addr(ownerPubKey.toAddress().toByteString());
                const PubKeyGN = bsv.PublicKey.fromHex(ownerGN); 
                const realAddGN = bsv.Address.fromPublicKey(PubKeyGN).toString();
                const addressGN = Addr(PubKeyGN.toAddress().toByteString());
                const amountQuarks = BigInt(quarks); 


                await PaymentContract.loadArtifact();
                const contract = new PaymentContract(owner, adminPubKey, addressGN, amountQuarks, qtyTokens, datas, txids);

                await contract.connect(signer)

                try {
                    const deployTx = await contract.deploy(1);

                    const result = {
                        contractId: deployTx.id,
                        state: contract.dataPayments,
                        addressOwner: realAddOwner,
                        addressGN: realAddGN,
                        paymentQuarks: contract.amountGN
                    };
    
                    //console.log(result);
                    await cleanResultFile('${resultFilePath}', result)
                    //await fs.writeFile('${resultFilePath}', JSON.stringify(result, null, 2));
                }
                catch (error) {
                    if (error.message.includes('txn-mempool-conflict')) {
                        console.log('Mempool conflict detected. Retrying after 5 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos
                        //return main(qtyT, l, fIn, ownerPub, ownerGN, quarks); // Intenta desplegar nuevamente
                        const deployTx = await contract.deploy(1);

                        const result = {
                            contractId: deployTx.id,
                            state: contract.dataPayments,
                            addressOwner: realAddOwner,
                            addressGN: realAddGN,
                            paymentQuarks: contract.amountGN
                        };
        
                        await cleanResultFile('${resultFilePath}', result)
                    } else {
                        console.error('Error during deployment:', error);
                    }
                }
            }

            async function genDatas(n: number, l: number, fechaInicio: number): Promise<FixedArray<Timestamp, typeof N>> {
                
                const fechas: FixedArray<Timestamp, typeof N> = fill(0n, N);
                //console.log('fechas antes de: ', fechas)

                for (let i = 0; i < n; i++) {
                    const fecha = BigInt(fechaInicio + i * l);
                    //console.log('fecha: ', fecha)
                    fechas[i] = BigInt(fecha);
                }

                //console.log('fechas después de: ', fechas);

                return fechas;
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
                    fs.writeFile(resultFilePath, formattedResult, 'utf-8');
            
                    console.log('Archivo de resultados limpiado y guardado en: ' + resultFilePath);
                } catch (error) {
                    console.error('Error al limpiar el archivo de resultados: ' + error.message);
                }
            }

            main(${qtyT}, ${lapse}, ${startDate}, "${ownerPubKey}", "${ownerGNKey}", ${quarks}).catch(console.error);

        `;  //qtyTokens, lapse, startDate, ownerPubKey, ownerGNKey, quarks
    
        const fileHandle = await fs.open(deployPath, 'w');
        await fileHandle.write(deployCode);
        await fileHandle.close();
        
        console.log('Archivo deploy.ts actualizado con los nuevos parámetros.');

         
        await new Promise((resolve, reject) => {
            exec('npx scrypt-cli deploy', { cwd: contractDir }, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error al desplegar el contrato: ${stderr}`);
                    return reject(new Error('Fallo en el despliegue'));
                }
                console.log(`Despliegue exitoso: ${stdout}`);
                resolve();  // Resolver la promesa una vez que el despliegue sea exitoso
            });
        });

        try {
            // Comprobar si el archivo existe
            await fs.access(resultFilePath);
            
            // Leer el archivo si existe
            const resultData = await fs.readFile(resultFilePath, 'utf8');
            const result = JSON.parse(resultData);
            console.log('Resultado del contrato desplegado:', result);
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

          async function prepareDeployment(size, tokens, lapso, start, pubOwner, pubGN, quarks) {
            try {
                const sizePresent = await getDataPaymentsSize();
                console.log('Size present is: ', sizePresent)
                // Verificar si el tamaño actual es diferente del solicitado o si no hay datos almacenados
                if (sizePresent !== size || sizePresent == null) {
                    const isCached = await checkCache(size);
                    
                    if (isCached) {
                        console.log(`Usando artifacts en caché para size ${size}.`);
                        // Si la caché existe, restaurar los artifacts y el código fuente
                        try {
                            await restoreArtifacts(size);
                        } catch {
                            throw new Error('Artifacts were not restored.')
                        }
                    } else {
                        // Si no hay caché, lanzar un error
                        throw new Error(`No artifacts found for contract of size ${size}`);
                    }
                }
        
                // Llamar a `createDeploy` para realizar el despliegue del contrato
                console.log('Llamando createDeploy...');
                const result = await createDeploy(tokens, lapso, start, pubOwner, pubGN, quarks);
                console.log('Contrato desplegado exitosamente.');
                return result;
        
            } catch (error) {
                throw new Error(`Error en el proceso: ${error.message}`);
            }
        }
        
        async function runDeploy(size, tokens, lapso, start, pubOwner, pubGN, quarks) {
            try {
                // Llamamos a `prepareDeployment` y esperamos el resultado
                const result = await prepareDeployment(size, tokens, lapso, start, pubOwner, pubGN, quarks);
        
                // Verificamos que el resultado sea válido
                if (result && typeof result === 'object' && result.contractId) {
                    console.log('Proceso completado exitosamente. Contrato desplegado:', JSON.stringify(result, null, 2));
                    return result;  // Retornar el resultado para su posterior uso
                } else {
                    throw new Error('La respuesta del despliegue no es válida o no contiene un contractId.');
                }
        
            } catch (error) {
                console.error('Error en el proceso de creación, compilación o despliegue:', error.message);
                throw error;  // Propagar el error para que sea manejado en niveles superiores
            }
        }
        

module.exports = runDeploy;

/*(async () => {
    try {
        const result = await createAndCompileAndDeploy(
            5000,              // Tokens
            60,                // Intervalo de tiempo entre transacciones
            1726598373,        // Fecha de inicio (timestamp)
            "02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db",  // Clave pública del dueño
            "02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc",  // Clave pública de la GN del dueño
            2125              // Quarks
        );
        console.log(result);
    } catch (error) {
        console.error('Error en el despliegue:', error);
    }
})();*/

 
    