const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;


const contractDir = path.resolve(__dirname, './payContract');



const deployFileName = `deploy.ts`;
const deployPath = path.resolve(contractDir, deployFileName);


async function createAndCompileAndDeploy(qtyT, lapse, startDate, ownerPubKey, ownerGNKey, quarks) {
    try {

        const deployCode = `
           import { PaymentContract, Timestamp, N } from './src/contracts/paycontract';
            import { bsv, DefaultProvider, TestWallet, PubKey, Addr, ByteString, FixedArray, toByteString, fill } from 'scrypt-ts';
            import { adminPublicKey } from './config';

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

                const deployTx = await contract.deploy(1);

                const result = {
                    contractId: deployTx.id,
                    state: contract.dataPayments,
                    addressOwner: realAddOwner,
                    addressGN: realAddGN
                };

                console.log(JSON.stringify(result));
                return result;
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

            main(${qtyT}, ${lapse}, ${startDate}, '${ownerPubKey}', '${ownerGNKey}', ${quarks}).catch(console.error);

        `;  //qtyTokens, lapse, startDate, ownerPubKey, ownerGNKey, quarks
    
        const fileHandle = await fs.open(deployPath, 'w');
        await fileHandle.write(deployCode);
        await fileHandle.close();
        
        console.log('Archivo deploy.ts actualizado con los nuevos parámetros.');

        exec('npx scrypt-cli deploy', { cwd: contractDir }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error al desplegar el contrato: ${stderr}`);
                throw new Error('Fallo en el despliegue');
            }
            console.log(`Despliegue exitoso: ${stdout}`);
        });
        
    } catch (error) {
        console.error(`Error en el proceso: ${error.message}`);
        throw error;
    }
}

module.exports = createAndCompileAndDeploy;

//createAndCompileAndDeploy();
/*
 5,                 // Tamaño del contrato
    5000,              // Tokens
    60,                // Intervalo de tiempo entre transacciones
    1726598373,        // Fecha de inicio (timestamp)
    '02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db',  // Clave pública del dueño
    '02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc',  // Clave pública de la GN del dueño
    2125              // Quarks
    */