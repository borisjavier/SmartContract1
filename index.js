const express = require('express');
const runContract = require('./deployContract.js');
const payScript = require('./payScript.js');
const { deployEscrowContract } = require('./escrowContract/dist/deployModule');
const { payEscrowContract } = require('./escrowContract/dist/payEscrowModule');
const { refundEscrowContract } = require('./escrowContract/dist/refundEscrowModule');
const { Mutex } = require('async-mutex');
const mutex = new Mutex();  // Mutex compartido para ambas funciones
const mutexE = new Mutex();

const app = express();
app.use(express.json());


//TEST: runContract(5, 10, 60, 1726598373, "02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db", "02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc", 3000);

// Endpoint para generar un contrato
app.post('/gen-contract', async (req, res) => {
  const { size, tokens, lapso, start, pubOwner, pubGN, quarks } = req.body;
  
  try {
    await mutex.runExclusive(async () => {
      const result = await runContract(size, tokens, lapso, start, pubOwner, pubGN, quarks);
      if (result && typeof result === 'object' && result.contractId) {
        res.status(200).json({
          message: 'Contrato generado exitosamente',
          contractId: result.contractId,
          state: result.state,
          addressOwner: result.addressOwner,
          addressGN: result.addressGN,
          paymentQuarks: result.paymentQuarks
        });
      } else {
        throw new Error('La respuesta del contrato es inválida o incompleta');
      }
    });
  } catch (error) {
    console.error(`Error de despliegue: ${error.message}`);
    res.status(500).json({ error: `Error al desplegar el contrato: ${error.message}` });
  }
});


// Endpoint para desplegar un contrato
app.post('/pay', async (req, res) => {
  const { size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey } = req.body;

  try {
    await mutex.runExclusive(async () => {
      const result = await payScript(size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey);
      if (result && typeof result === 'object' && result.lastStateTxid) {
        res.status(200).json({
          message: 'Se ha efectuado un pago en el contrato.',
          contractId: result.lastStateTxid,
          state: result.state,
          addressGN: result.addressGN,
          amountGN: result.amountGN,
          isValid: result.isValid
        });
      } else {
        throw new Error('La respuesta del contrato es inválida o incompleta');
      }
    });
  } catch (error) {
    res.status(500).send({ error: `Error al llamar al método en payScript: ${error.message}` });
  }
});




app.post('/transfer', async (req, res) => {
  const { size } = req.body;  // Obtener el parámetro `size` de la solicitud

  try {
    await deployContract(size);  // Llamar a la función para desplegar el contrato
    res.status(200).send({message: `Contrato desplegado con size: ${size}`});
  } catch (error) {
    res.status(500).send({ error: `Error al llamar al método en transferModule: ${error.message}` });
  }
});


app.post('/depEscrow', async (req, res) => {
  const { publicKeys, lockTimeMin } = req.body;
  try {
        if (!publicKeys || !Array.isArray(publicKeys) || publicKeys.length === 0) {
          return res.status(400).json({ error: "publicKeys inválido" });
        }
        if (!lockTimeMin || isNaN(lockTimeMin)) {
          return res.status(400).json({ error: "lockTimeMin inválido" });
        }
    
        const deployParams = {
            publicKeys: publicKeys,
            lockTimeMin: BigInt(lockTimeMin),
            amount: 10
        };
        await mutex.runExclusive(async () => {
          const result = await deployEscrowContract(deployParams);
          return {
            txId: result.txId,
            keyUsed: result.keyUsed
          };
        });
    } catch (error) {
        console.error('Error deploying escrow contract:', error);
        throw new Error(`Escrow deployment failed: ${error.message}`);
    }
})

app.post('/payEsc', async (req, res) => {
    const { txId, deployerKeyType, participantKeys, atOutputIndex } = req.body;
    try {
        // Validación básica
        if (!txId || !deployerKeyType || !participantKeys) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        const payParams = {
            txId: txId,
            deployerKeyType: deployerKeyType,
            participantKeys: participantKeys,
            atOutputIndex: atOutputIndex || 0
        };

        // Usamos mutex para exclusión mutua
        await mutexE.runExclusive(async () => {
            const result = await payEscrowContract(payParams);
            res.status(200).json({
                message: 'Escrow payment successful',
                txId: result.txId,
                usedKeyType: result.usedKeyType
            });
        });
    } catch (error) {
        console.error('Error paying escrow contract:', error);
        res.status(500).json({ 
            error: 'Escrow payment failed',
            message: error.message 
        });
    }
});

app.post('/callRefund', async (req, res) => {
    const { txId, deployerKeyType, participantKeys, atOutputIndex } = req.body;
    try {
        // Validación básica
        if (!txId || !deployerKeyType || !participantKeys) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        const refundParams = {
            txId: txId,
            deployerKeyType: deployerKeyType,
            participantKeys: participantKeys,
            atOutputIndex: atOutputIndex || 0
        };

        // Usamos mutex para exclusión mutua
        await mutexE.runExclusive(async () => {
            const result = await refundEscrowContract(refundParams);
            res.status(200).json({
                message: 'Escrow refund successful',
                txId: result.txId,
                usedKeyType: result.usedKeyType
            });
        });
    } catch (error) {
        console.error('Error refunding escrow contract:', error);
        res.status(500).json({ 
            error: 'Escrow refund failed',
            message: error.message 
        });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {  
  console.log(`Cloud Run escuchando en el puerto ${PORT}`);
});

/**
 * TEST DEPLOY NEW INSTANCE
 * size, tokens, lapso, start, pubOwner, pubGN, quarks 
 * Invoke-RestMethod -Uri "http://localhost:8080/gen-contract" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"size": 5, "tokens": 10, "lapso": 60, "start": 1726598373, "pubOwner": "02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db", "pubGN": "02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc", "quarks": 3000}'
 * 
 * TEST PAY
 * size, lastStateTxid, datas, txids, txidPago, qtyT, ownerPubKey
 * Invoke-RestMethod -Uri "http://localhost:8080/pay" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"size": 5, "tokens": 10, "lapso": 60, "start": 1726598373, "pubOwner": "02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db", "pubGN": "02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc", "quarks": 3000}'
 * 
 */
