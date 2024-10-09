const path = require('path');
const fs = require('fs').promises; // Acceso a fs.promises para funciones async

//Ruta al json para determinar size de lo que tenemos
const contractPath = path.join(__dirname, 'contractDir/artifacts/paycontract.json');
const cacheDir = path.resolve(__dirname, './cache'); 
const contractDir = path.resolve(__dirname, './payContract');
const artifactsDir = path.resolve(contractDir, './artifacts');

// Función para verificar si un archivo existe
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Función para verificar si un directorio existe
async function dirExists(dirPath) {
    try {
        await fs.access(dirPath);
        return true;
    } catch {
        return false;
    }
}

async function checkCache(size) {
    const cachePath = path.resolve(cacheDir, `paycontract_${size}`);
    
    // Verificar si el directorio de caché existe
    if (!await dirExists(cachePath)) {
        console.log(`El directorio de caché no existe para size ${size}.`);
        return false;  // El directorio no existe, por lo que no hay caché
    }

    try {
        // Verifica si los archivos de caché existen
        const files = await fs.readdir(cachePath);
        
        // Verifica si hay exactamente 5 archivos en la caché
        if (files.length === 5) {
            console.log(`Artifacts encontrados en la caché para size ${size}.`);
            return true;  // Si los artifacts están presentes, indica que ya están en caché
        } else {
            console.log(`Se encontraron ${files.length} archivos en la caché para size ${size}, se esperaban 5.`);
            return false;  // No hay suficientes archivos en la caché
        }
    } catch (error) {
        console.error(`Error al leer el directorio de caché: ${error.message}`);
        return false;  // Si hay un error al leer el directorio, se asume que no hay caché
    }
}

async function restoreArtifacts(size) {
    // Lista de artifacts a restaurar desde la caché
    const artifacts = [
      'paycontract.json', 
      'paycontract.scrypt', 
      'paycontract.scrypt.map', 
      'paycontract.transformer.json'
    ];
  
    const cachePath = path.resolve(cacheDir, `paycontract_${size}`);
    const contractDirPath = path.resolve(contractDir, 'src', 'contracts');  // Ruta a la carpeta 'src/contracts'
    const artifactsDirPath = path.resolve(artifactsDir);  // Ruta a la carpeta 'artifacts'
  
    try {

      // Verificar si el directorio de caché existe
      if (!await dirExists(cachePath)) {
        throw new Error(`El directorio de caché no existe: ${cachePath}`);
    }

    if (await dirExists(artifactsDirPath)) {
        await fs.rm(artifactsDirPath, { recursive: true, force: true });
        console.log(`Directorio ${artifactsDirPath} limpiado.`);
        await fs.mkdir(artifactsDirPath, { recursive: true });
    }


  
      // 2. Restaurar los artifacts a la carpeta 'artifacts'
      for (const file of artifacts) {
        const srcPath = path.resolve(cachePath, file);      // Ruta de origen en la caché
        const destPath = path.resolve(artifactsDirPath, file);  // Ruta destino en 'artifacts'
        await fs.copyFile(srcPath, destPath);               // Copia el archivo desde la caché a 'artifacts'
        console.log(`Artifact ${file} restaurado desde la caché para size ${size}.`);
      }
  
      // 3. Eliminar todo el contenido de 'src/contracts' antes de copiar el archivo paycontract.ts
      await fs.rm(contractDirPath, { recursive: true, force: true });
      console.log(`Directorio ${contractDirPath} limpiado.`);
  
      // 4. Restaurar el archivo paycontract.ts a 'src/contracts'
      const contractFile = 'paycontract.ts';
      const contractSrcPath = path.resolve(cachePath, contractFile);  // Ruta de origen en la caché
      const contractDestPath = path.resolve(contractDirPath, contractFile);  // Ruta destino en 'src/contracts'
  
      // Crear nuevamente el directorio 'src/contracts' si ha sido eliminado
      await fs.mkdir(contractDirPath, { recursive: true });
  
      await fs.copyFile(contractSrcPath, contractDestPath);  // Copiar el archivo paycontract.ts a 'src/contracts'
      console.log(`Archivo ${contractFile} restaurado desde la caché para size ${size}.`);
  
    } catch (error) {
      console.error(`Error al restaurar los artifacts desde la caché: ${error.message}`);
      throw error;
    }
  }

  async function getDataPaymentsSize() {
    try {
        // Leer el archivo JSON usando fs.promises
        const data = await fs.readFile(contractPath, 'utf8');

        // Parsear el archivo JSON
        const contractJson = JSON.parse(data);

        // Encontrar la propiedad "dataPayments" en stateProps
        const dataPaymentProp = contractJson.stateProps.find(
            function(prop) {
                return prop.name === 'dataPayments';
            }
        );

        if (dataPaymentProp) {
            // Extraer el tipo de la propiedad (en este caso, "Payment[5]")
            const type = dataPaymentProp.type;
            
            // Usar una expresión regular para encontrar el tamaño dentro de los corchetes []
            const match = type.match(/\[(\d+)\]/);

            if (match && match[1]) {
                const size = parseInt(match[1], 10);
                console.log(`El tamaño de 'dataPayments' es: ${size}`);
                return size;
            } else {
                console.log('No se encontró el tamaño en el tipo de la propiedad dataPayments.');
                return null;
            }
        } else {
            console.log('No se encontró la propiedad "dataPayments" en stateProps.');
            return null;
        }
    } catch (err) {
        console.error('Error al leer o procesar el archivo JSON:', err);
        return null;
    }
}

module.exports = {
    checkCache,
    dirExists,
    fileExists,
    getDataPaymentsSize,
    restoreArtifacts
};
