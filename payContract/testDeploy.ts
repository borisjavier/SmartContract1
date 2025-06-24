//import axios from 'axios';
//import * as dotenv from 'dotenv';
import { deployContract, DeployParams } from './deployModule';
import { adminPublicKey } from './config';
//dotenv.config();
//const adminPubKey = adminPublicKey;
//console.log('PRIVATE_KEY: ', process.env.PRIVATE_KEY)
//const TEST_URL = 'http://localhost:8080/deploy';

// 1. Define una interfaz para los objetos de pago
interface PaymentItem {
  timestamp: string;
  txid: string;
}

const deployParams = {
  qtyT: 100,          // Cantidad de tokens
  lapse: 300,        // Intervalo de 1 día en segundos
  startDate: Math.floor(Date.now() / 1000), // Timestamp actual
  ownerPub: '034aac8b022a85c8ab85a54f669edd0ff83cb099826583a2bb55f6095003fab30b',
  ownerGN: '036d37bf32c8c444614ce9c354d0a4b2886a6506317ee9d7f50383f9520f610d2b',
  quarks: 5000,        // Monto en quarks (0.00005 BSV)
  //adminPublicKey: adminPubKey,
  //privateKey: process.env.PRIVATE_KEY!
};
//console.log("Parámetros pasados a deployModule:", deployParams);

export async function testDeployment(deployParams: DeployParams) {
  console.log("Parámetros pasados a deployModule:", deployParams);
  try {
    //const response = await axios.post(TEST_URL, deployParams);
    const result = await deployContract(deployParams);
    console.log('🔑 Admin Public Key:', adminPublicKey);
    console.log('🔑 Private Key:', process.env.PRIVATE_KEY?.substring(0, 6) + '...');
    
    console.log('🚀 Despliegue exitoso!');
    console.log('📝 Contrato ID:', result.contractId);
    console.log('👤 Owner Address:', result.addressOwner);
    console.log('🏦 GN Address:', result.addressGN);
    console.log('💸 Pago en quarks:', result.paymentQuarks.toString());
    console.log('🗓️ Estado inicial de pagos:');
    result.state.forEach((payment: PaymentItem, index: number) => {
      console.log(`   ${index + 1}: Timestamp=${payment.timestamp}, TXID=${payment.txid}`);
    });
  } catch (error) {
    console.error('❌ Error en despliegue:');
    
    // Manejo de errores mejorado
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      
      // Si es un error con más detalles (como respuesta HTTP)
      if ('response' in error && error.response) {
        console.error('Detalles adicionales:', error.response);
      } else {
        console.error('Stack:', error.stack);
      }
    } else {
      console.error('Error desconocido:', error);
    }
  }
}

testDeployment(deployParams);
//export default testDeployment;