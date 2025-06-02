
            import { PaymentContract, Timestamp, Payment, N } from './src/contracts/paycontract';
            import { bsv, PubKey, Addr, fill, toByteString, FixedArray, ByteString } from 'scrypt-ts';
            //import { promises as fs } from 'fs';
            import * as dotenv from 'dotenv'
            /*
             * findSig,
             * MethodCallOptions, 
             * , DefaultProvider, TestWallet
             */
                        // Cargar el archivo .env
                        dotenv.config()

                        if (!process.env.PRIVATE_KEY) {
                            throw new Error("No 'PRIVATE_KEY' found in .env, Please run 'npm run genprivkey' to generate a private key")
                        }

            const privateKey = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY || '');
            /*const provider = new DefaultProvider({
                network: bsv.Networks.mainnet,
            });

            const signer = new TestWallet(
                privateKey,
                provider
            )*/

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
                console.log(`pubKey: ${pubKey} en txid output ${atOutputIndex}`)
                //const publicKey = privateKey.publicKey;

                const ownerPubKey = bsv.PublicKey.fromHex('0316480d9da880ec435d42a1f6428a00d27d738eb2bbf0ae7c2da94561af209225');//Alice's Pubkey
                const owner = Addr(ownerPubKey.toAddress().toByteString());
                console.log(`owner: ${owner}`)
                const currentDate: bigint = BigInt(Math.floor(Date.now() / 1000));
                const tx0 = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
                //
            
                const txIdPago = toByteString('6f2d2ac9309a6caf7f74b20491f380d4678cbb2fc5a2a3c4e42c11b3dce3acbe');//obtida da publicação da transação GN
                await PaymentContract.loadArtifact()

                
                //const txResponse = await provider.getTransaction(txId);
                
                //const instance = PaymentContract.fromTx(txResponse, atOutputIndex)
                //await instance.connect(signer); //getDefaultSigner(privateKey)
                
                const datas: FixedArray<Timestamp, typeof N> = [1732128366n, 1732128386n, 1732128406n, 1732128426n, 1732128446n, 1732128466n, 1732128486n, 1732128506n, 1732128526n, 1732128546n, 1732128566n, 1732128586n]
            
                //console.log('datas: ', datas)
                const txids: FixedArray<ByteString, typeof N> = ["501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836",
                    "501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836"]

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
                    /*dataPayments[i] = {
                        timestamp: datas[i],
                        txid: txids[i],
                    }*/
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
                const qtyTokens: bigint = 1n
                console.log('qtyTokens: ',qtyTokens);
                /*try {
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
                    await fs.writeFile('C:/Users/Boris Javier/Documents/Javier/BTCFACILCOLOMBIA.com/runonbitcoin/run-0.6.5-alpha/SmartContracts/payContract/payResult.json', JSON.stringify(result, null, 2));
                    
                } catch (error) {
                    console.error('Contract call failed:', error)
                }*/


            }

            main("efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7").catch(console.error);

        