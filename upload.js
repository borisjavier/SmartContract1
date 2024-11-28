const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializa la aplicación de Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'goldennotes-app.appspot.com' // Reemplaza con el nombre de tu bucket
});

const bucket = admin.storage().bucket();

// Función para subir un archivo
async function uploadFile(filePath, destination) {
  const contentType = getContentType(path.basename(filePath)); 
  await bucket.upload(filePath, {
    destination: destination,
    metadata: {
      contentType: contentType,
    },
  });
  console.log(`${filePath} subido a ${destination}`);
}

// Lista de carpetas a procesar
const folders = [
  'paycontract_1',
  'paycontract_10',
  'paycontract_108',
  'paycontract_12',
  'paycontract_120',
  'paycontract_14',
  'paycontract_16',
  'paycontract_18',
  'paycontract_2',
  'paycontract_20',
  'paycontract_24',
  'paycontract_28',
  'paycontract_3',
  'paycontract_30',
  'paycontract_32',
  'paycontract_36',
  'paycontract_4',
  'paycontract_40',
  'paycontract_42',
  'paycontract_48',
  'paycontract_5',
  'paycontract_54',
  'paycontract_6',
  'paycontract_60',
  'paycontract_7',
  'paycontract_72',
  'paycontract_8',
  'paycontract_84',
  'paycontract_9',
  'paycontract_96'
];


// Ruta base donde se encuentran las carpetas
const baseFolderPath = 'C:/Users/Boris Javier/Documents/Javier/BTCFACILCOLOMBIA.com/Golden Notes Notes/Backups/scrypt artifacts contract golden tokens/cache'
//const baseFolderPath = 'C:/Users/Boris Javier/Documents/Javier/BTCFACILCOLOMBIA.com/runonbitcoin/run-0.6.5-alpha/SmartContracts/cache'; // Cambia esto a tu ruta
const destinationBaseFolder = 'sCrypt cache'; // Carpeta de destino en el bucket

// Procesa cada carpeta
folders.forEach(folder => {
  const folderPath = path.join(baseFolderPath, folder);
  
  // Verifica si la carpeta existe
  if (fs.existsSync(folderPath)) {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error('Error al leer la carpeta:', err);
        return;
      }

      files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const destinationPath = path.join(destinationBaseFolder, folder, file).replace(/\\/g, '/'); // Carpeta de destino en el bucket

        // Verifica si es un archivo antes de intentar subirlo
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error('Error al obtener información del archivo:', err);
            return;
          }

          if (stats.isFile()) {
            uploadFile(filePath, destinationPath).catch(console.error);
          } else {
            console.log(`${filePath} es un directorio y no se subirá.`);
          }
        });
      });
    });
  } else {
    console.log(`La carpeta ${folderPath} no existe.`);
  }
});

function getContentType(fileName) {
    if (fileName.endsWith('.json')) {
      return 'application/json';
    } else if (fileName.endsWith('.scrypt')) {
      return 'text/plain'; // O el tipo específico si lo conoces
    } else if (fileName.endsWith('.map')) {
      return 'application/json'; // O 'text/plain' si prefieres
    } else if (fileName.endsWith('.ts')) {
        return 'application/typescript'; 
    }
    return 'application/octet-stream'; // Tipo por defecto
  }
