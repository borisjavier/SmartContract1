
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
                    await cleanResultFile('C:/Users/Boris Javier/Documents/Javier/BTCFACILCOLOMBIA.com/runonbitcoin/run-0.6.5-alpha/SmartContracts/payContract/deployResult.json', result)
                    //await fs.writeFile('C:/Users/Boris Javier/Documents/Javier/BTCFACILCOLOMBIA.com/runonbitcoin/run-0.6.5-alpha/SmartContracts/payContract/deployResult.json', JSON.stringify(result, null, 2));
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
        
                        await cleanResultFile('C:/Users/Boris Javier/Documents/Javier/BTCFACILCOLOMBIA.com/runonbitcoin/run-0.6.5-alpha/SmartContracts/payContract/deployResult.json', result)
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
                    await fs.writeFile(resultFilePath, formattedResult, 'utf-8');
            
                    console.log(`Archivo de resultados limpiado y guardado en: ${resultFilePath}`);
                } catch (error) {
                    console.error(`Error al limpiar el archivo de resultados: ${error.message}`);
                }
            }
            //(qtyT, l, fIn, ownerPub, ownerGN, quarks)//pub Alice, GNAddress: Punto (14HGSX9cmRvBnuJPd77KT1m2V1LqBnKbcz),
            main(1, 100, 1732128366, "032adc904bbcba519b348b0c42ba2467002a793f1332cec64e8bf17e74ede035ee", "02b9acb0186ac12383aad6acddd48644c90d1e32cc7c352b4652a6d091412cffef", 1000).catch(console.error);

        