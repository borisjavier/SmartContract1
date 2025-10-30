//import axios from 'axios';
import { pay, PayParams } from './payScriptModule';
//import * as dotenv from 'dotenv';

//dotenv.config();

//const TEST_URL = 'http://localhost:8080/pay';


const payParams: PayParams = {
            txId: 'f17422cf7bf662b2002fa971c157387e7e07a3795daa57cbdc697230366371dd',
            atOutputIndex: 0,
            datas: [1754424914,1754428514,1754432124,1754435717,1754439322,1754442922,1754446517,1754447472,1754451072,1754454672,1754458272,1754461872,1754465472,1754469072,1754472672,1754476272,1754479872,1754483472,1754487072,1754490672,1754494272,1754497872,1754501472,1754505072].map(b => b.toString()),//
            txids: ['8f9f30699138361a6947a4b3c16d6fce424e58ca2bb50063a91d364dea5d6940','60c4d6eb3bee9b46e5e784332cc18f558e54b53e0164f7603dee22f7a0cd155c','62ded038af0186124c79f1af9905a272a8420d7a09ee41d43051c949667b9ae9','3fac449203c508fc2e2d344286936365516381b8be54a9d2b7720dbe1e5dc0c8','a81da46002dcaf65c257679578b04480894d4a28892ac4591306fd2dbc61c182','abeea0839019b8543e542327908a07c47b8cf6c55fe9733d9fe79add3a051222','80a923a99023ab59d2bcd4390815e408c39100181a4898f6d3d4dc2bd413d6b9','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836','501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'],
            txidPago: '3d303e40fd8814f4a286b98b58e843c9e256a70d3bddfc9ff0d445f1655c17f8',
            qtyTokens: 1,
            ownerPubKey: '0373323f48fa27eff5a5e9fe9fd585ce4665f94fa169a0f437ebd4e8439fa3d0e7'
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