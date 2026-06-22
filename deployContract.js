const { dynamicImport } = require('./utilities');
const path = require('path');
require('dotenv').config();
const contractDir = path.resolve(__dirname, './payContract');

let deployContractFromModule = null;

async function createDeploy(size, qtyT, lapse, startDate, ownerPubKey, ownerGNKey, quarks, purse, deployContractFunction) {
   try {  
    console.log(`ownerPubKey: ${ownerPubKey}, ownerGNKey: ${ownerGNKey}, quarks: ${quarks}`) 
    if (!process.env.PRIVATE_KEY) {
    throw new Error("La clave PRIVATE_KEY no está configurada en .env");
    }
    const deployParams = {
      n: size,
      qtyT: qtyT,
      lapse: lapse,
      startDate: startDate,
      ownerPub: ownerPubKey,
      ownerGN: ownerGNKey,
      quarks: quarks,
      purse: purse
    };

    const result = await deployContractFunction(deployParams);
    
    const resultArr = {
        contractId: result.contractId,
        state: result.state,
        addressOwner: result.addressOwner,
        addressGN: result.addressGN,
        paymentQuarks: result.paymentQuarks
    };
    console.log(resultArr)
    return resultArr;
  } catch (error) {
    // Propagamos el error con información detallada
    const enhancedError = new Error(`Despliegue fallido: ${error.message}`);
    enhancedError.originalError = error;
    throw enhancedError;
  }

}
        
        async function runDeploy(size, tokens, lapso, start, pubOwner, pubGN, quarks, purse) {
            try {
                if (!deployContractFromModule) {
                    const finalPath = path.resolve(contractDir, 'dist', 'deployModule.js');
                    console.log(`🔍 Cargando módulo en memoria por primera vez desde: ${finalPath}`);

                    const deployModule = await dynamicImport(finalPath);
                    deployContractFromModule = deployModule.deployContract;

                    if (!deployContractFromModule) {
                        throw new Error("No se pudo cargar la función deployContract del módulo.");
                    }
                } else {
                    console.log('⚡ Módulo recuperado instantáneamente desde la caché en memoria.');
                }
                

                console.log('Llamando createDeploy...');
                const result = await createDeploy(size, tokens, lapso, start, pubOwner, pubGN, quarks, purse, deployContractFromModule);
                console.log('Contrato desplegado exitosamente.');
                return result;
        
            } catch (error) {
                throw new Error(`Error en el proceso: ${error.message}`);
            }
        }
        

module.exports = runDeploy;
 
    