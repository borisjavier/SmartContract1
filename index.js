const express = require('express');
const runContract = require('./genContract.js')

const app = express();
app.use(express.json());


//TEST: runContract(5, 10, 60, 1726598373, "02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db", "02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc", 3000);

// Endpoint para generar un contrato
app.post('/gen-contract', async (req, res) => {
  //console.log('Datos recibidos:', req.body);  // Imprimir los datos del cuerpo de la solicitud
  
  const { size, tokens, lapso, start, pubOwner, pubGN, quarks } = req.body;  // Obtener el parámetro `size` de la solicitud
  
  try {
    const result = await runContract(size, tokens, lapso, start, pubOwner, pubGN, quarks);  
    if (result && typeof result === 'object' && result.contractId) {
      // Enviamos la respuesta de éxito con los detalles del contrato
      res.status(200).json({
        message: 'Contrato generado exitosamente',
        contractId: result.contractId,
        state: result.state,
        addressOwner: result.addressOwner,
        addressGN: result.addressGN,
        paymentQuarks: result.paymentQuarks
      });
    } else {
      // Si el resultado no es válido, lanzamos un error personalizado
      throw new Error('La respuesta del contrato es inválida o incompleta');
    }

  } catch (error) {
    // Manejo de errores, devolvemos el error como JSON
    console.error(`Error en la compilación: ${error.message}`);
    res.status(500).json({ error: `Error al generar contrato: ${error.message}` });
  }
});

// Endpoint para desplegar un contrato
app.post('/deploy-contract', async (req, res) => {
  const { size } = req.body;  // Obtener el parámetro `size` de la solicitud

  try {
    await deployContract(size);  // Llamar a la función para desplegar el contrato
    res.status(200).send({message: `Contrato desplegado con size: ${size}`});
  } catch (error) {
    res.status(500).send({ error: `Error al desplegar contrato: ${error.message}` });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Cloud Run escuchando en el puerto ${PORT}`);
});

/**
 * TEST
 * Invoke-RestMethod -Uri "http://localhost:8080/gen-contract" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"size": 5, "tokens": 10, "lapso": 60, "start": 1726598373, "pubOwner": "02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db", "pubGN": "02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc", "quarks": 3000}'
 */
