const express = require('express');
const runContract = require('./genContract.js')

const app = express();
app.use(express.json());



// Endpoint para generar un contrato
app.post('/gen-contract', async (req, res) => {
  const { size, tokens, lapso, start, pubOwner, pubGN, quarks } = req.body;  // Obtener el parámetro `size` de la solicitud

  try {
    // Llamamos a la función compileContract y obtenemos el nombre del archivo generado
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
