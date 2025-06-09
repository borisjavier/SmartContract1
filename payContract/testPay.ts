//import axios from 'axios';
import { pay, PayParams } from './payScriptModule';
//import * as dotenv from 'dotenv';

//dotenv.config();

//const TEST_URL = 'http://localhost:8080/pay';


const payParams: PayParams = {
            txId: '48c14d051dcd768a0e3bf1600b3ddb184ef7c5b44367915bf8ed6d8a30df1a74',
            atOutputIndex: 0,
            datas: [1749505049, 1749505455, 1749506119, 1749504933].map(b => b.toString()),//
            txids: [
                'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
                'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
                'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
                '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'
            ],
            txidPago: 'efaacbcaa8daa4a6a7fa8b2bb91a7cb6ce732fcdd351e0596968891e299f46a7',
            qtyTokens: 100,
            ownerPubKey: '034aac8b022a85c8ab85a54f669edd0ff83cb099826583a2bb55f6095003fab30b'
        };

async function testPay() {
    try {
        //const response = await axios.post(TEST_URL, payParams);
        const result = await pay(payParams);
        
        console.log('🚀 Pago registrado exitosamente!');
        console.log('📝 Nueva transacción ID:', result.lastStateTxid);//response.data
        console.log('🏦 GN Address:', result.addressGN);//response.data
        console.log('💸 Monto en quarks:', result.amountGN); //.toString() response.data
        console.log('✅ Contrato válido:', result.isValid); //response.data
        console.log('🗓️ Nuevo estado de pagos:');
        result.state.forEach((payment, index) => { //response.data
            console.log(`   ${index + 1}: Timestamp=${payment.timestamp}, TXID=${payment.txid}`);
        });
    } catch (error) {
        console.error('❌ Error en registro de pago:', error.message);
    }
}

testPay();