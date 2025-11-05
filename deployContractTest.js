const { deployContract } = require('./payContract/dist/deployModule.js');


async function createDeploy() {
   try {   
    const deployParams = {
    n: 8, //size
    qtyT: 100,          // Cantidad de tokens
    lapse: 300,        // Intervalo de 1 día en segundos
    startDate: Math.floor(Date.now() / 1000), // Timestamp actual
    ownerPub: '0285f609126a21237c95f5b211d477b4f6e4bcb0e40103d2107c7b7315dc5bc634',
    ownerGN: '036d37bf32c8c444614ce9c354d0a4b2886a6506317ee9d7f50383f9520f610d2b',
    quarks: 5000,        // Monto en quarks (0.00005 BSV)
    };

    const result = await deployContract(deployParams);
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

          
createDeploy();
 
    