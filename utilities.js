const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs').promises; // Acceso a fs.promises para funciones async

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.STORAGE_BUCKET // Reemplaza con el nombre de tu bucket
});

const bucket = admin.storage().bucket();

//Ruta al json para determinar size de lo que tenemos
const contractPath = path.join(__dirname, './payContract/artifacts/paycontract.json');
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

async function downloadFile(fileName, destinationPath) {
    const file = bucket.file(fileName);
    await file.download({ destination: destinationPath });
    console.log(`Archivo ${fileName} descargado a ${destinationPath}`);
}


async function checkCache(size) {
    const cacheFolder = `sCrypt cache/paycontract_${size}`;
    const expectedFiles = ['paycontract.json', 'paycontract.scrypt', 'paycontract.scrypt.map', 'paycontract.transformer.json', 'paycontract.ts'];

    try {
        // Listar archivos en el directorio de Firebase Storage
        const [files] = await bucket.getFiles({ prefix: `${cacheFolder}/` });

        // Extraer solo los nombres de los archivos desde Firebase
        const fileNames = files.map(file => path.basename(file.name));

        // Comprobar si los archivos esperados están presentes
        if (expectedFiles.every(file => fileNames.includes(file))) {
            console.log(`Artifacts encontrados en caché para size ${size}.`);
            return true;
        } else {
            console.log(`Se encontraron ${fileNames.length} archivos, se esperaban 5 para size ${size}.`);
            return false;
        }
    } catch (error) {
        console.error(`Error al verificar caché para size ${size}: ${error.message}`);
        return false;
    }
}



  async function restoreArtifacts(size) {
    const artifacts = [
        'paycontract.json', 
        'paycontract.scrypt', 
        'paycontract.scrypt.map', 
        'paycontract.transformer.json'
    ];

    const cacheFolder = `sCrypt cache/paycontract_${size}`;
    const contractDirPath = path.resolve(contractDir, 'src', 'contracts');  // Ruta a la carpeta 'src/contracts'
    const theJSContractDirPath = path.resolve(contractDir, 'dist', 'src', 'contracts');
    const artifactsDirPath = path.resolve(artifactsDir);  // Ruta a la carpeta 'artifacts'

    try {
        //Crear el archivo correcto paycontract.ts
        // Limpiar el directorio 'artifacts' local
        await fs.rm(artifactsDirPath, { recursive: true, force: true });
        console.log(`Directorio de artefactos: ${artifactsDirPath} limpiado.`);
        await fs.mkdir(artifactsDirPath, { recursive: true });

        /*await fs.rm(theJSContractDirPath, { recursive: true, force: true });
        console.log(`Directorio JS del contrato: ${theJSContractDirPath} limpiado.`);
        await fs.mkdir(theJSContractDirPath, { recursive: true });*/

        // Descargar artifacts desde Firebase Storage a la carpeta 'artifacts' local
        for (const file of artifacts) {
            const srcPath = `${cacheFolder}/${file}`;
            const destPath = path.resolve(artifactsDirPath, file);
            await downloadFile(srcPath, destPath);
        }

        /*const jsArtifacts = [
            'paycontract.d.ts',
            'paycontract.js',
            'paycontract.js.map'
        ];*/

        /*for (const file of jsArtifacts) {
            const srcPath = `${cacheFolder}/${file}`;
            const destPath = path.resolve(theJSContractDirPath, file);
            await downloadFile(srcPath, destPath);
        }*/

        // Limpiar y preparar el directorio 'src/contracts'
        await fs.rm(contractDirPath, { recursive: true, force: true });
        console.log(`El Directorio ts del contrato: ${contractDirPath} fue limpiado.`);
        await fs.mkdir(contractDirPath, { recursive: true });

        // Restaurar 'paycontract.ts' desde Firebase a 'src/contracts'
        const contractFile = 'paycontract.ts';
        const contractSrcPath = `${cacheFolder}/${contractFile}`;
        const contractDestPath = path.resolve(contractDirPath, contractFile);
        await downloadFile(contractSrcPath, contractDestPath);

    } catch (error) {
        console.error(`Error al restaurar los artifacts para size ${size}: ${error.message}`);
        throw error;
    }
}

  /*async function getDataPaymentsSize() {
    try {
        // 1. Leer el archivo TS del contrato
        const tsPath = path.resolve(contractDir, 'src', 'contracts', 'paycontract.ts');
        const tsCode = await fs.readFile(tsPath, 'utf8');

        // 2. Buscar la línea que define N
        const nMatch = tsCode.match(/export\s+const\s+N\s*=\s*(\d+)/);

        if (!nMatch) {
            throw new Error("No se encontró la constante N en el contrato");
        }

        const tsSize = parseInt(nMatch[1], 10);
        console.log(`Valor de N detectado: ${tsSize}`);

        // 3. Leer y parsear JSON compilado
        let jsonSize = null;
            try {
            // Leer el archivo JSON usando fs.promises
            //const dataPath = path.resolve(contractDir, 'artifacts', 'paycontract.ts');
            const jsonData = await fs.readFile(contractPath, 'utf8');

            // Parsear el archivo JSON
            const contractJson = JSON.parse(jsonData);

            // Encontrar la propiedad "dataPayments" en stateProps
            const dataPaymentProp = contractJson.stateProps.find(prop => prop.name === 'dataPayments');

            if (dataPaymentProp) {
                
                const sizeMatch = dataPaymentProp.type.match(/\[(\d+)\]/);
                    if (sizeMatch) {
                        jsonSize = parseInt(sizeMatch[1], 10);
                    }
            } 
        } catch (err) {
            console.warn("⚠️ No se pudo verificar el JSON:", err.message);
        }

         // 4. Verificar consistencia
        if (jsonSize !== null && tsSize !== jsonSize) {
            console.error("⚠️ INCONSISTENCIA: TS Size:", tsSize, "JSON Size:", jsonSize);
        }
        return {
            tsSize,
            jsonSize,
            source: jsonSize !== null ? "both" : "ts-only"
        };
    } catch (err) {
        console.error("❌ Error grave en getDataPaymentsSize:", err.message);
        return {
            tsSize: null,
            jsonSize: null,
            source: "error"
        };
    }
}*/

async function getDataPaymentsSize() {
    try {
        // Definición de rutas
        const tsPath = path.resolve(contractDir, 'src', 'contracts', 'paycontract.ts');
        const dtsPath = path.resolve(contractDir, 'dist', 'src', 'contracts', 'paycontract.d.ts');
        const jsonPath = path.resolve(artifactsDir, 'paycontract.json');

        // 1. Leer y comparar los tres archivos
        const [tsSize, dtsSize, jsonSize] = await Promise.all([
            extractSizeFromTs(tsPath),
            extractSizeFromDts(dtsPath),
            extractSizeFromJson(jsonPath)
        ]);

        // 2. Verificar consistencia entre todos los valores
        const sizes = { tsSize, dtsSize, jsonSize };
        const sizeValues = Object.values(sizes);
        const allEqual = sizeValues.every(val => val === sizeValues[0]);
        
        if (!allEqual) {
            const errorMessage = `❌ INCONSISTENCIA EN LOS TAMAÑOS:
            - TS (${tsPath}): ${tsSize}
            - d.ts (${dtsPath}): ${dtsSize}
            - JSON (${jsonPath}): ${jsonSize}`;
            
            console.error(errorMessage);
            throw new Error("Inconsistencia en los valores de N detectada");
        }

        console.log(`✅ Todos los tamaños coinciden: N = ${tsSize}`);
        return {
            tsSize,
            jsonSize,
            source: jsonSize !== null ? "both" : "ts-only"
        };
        
    } catch (err) {
        console.error("❌ Error crítico en getDataPaymentsSize:", err.message);
        throw err; // Propaga el error para detener la ejecución
    }
}

// Función auxiliar para extraer N de TypeScript
async function extractSizeFromTs(tsPath) {
    try {
        const tsCode = await fs.readFile(tsPath, 'utf8');
        const nMatch = tsCode.match(/export\s+const\s+N\s*=\s*(\d+)/);
        
        if (!nMatch) throw new Error("No se encontró la constante N en el contrato TypeScript");
        return parseInt(nMatch[1], 10);
        
    } catch (err) {
        throw new Error(`Error procesando TS: ${err.message}`);
    }
}

// Función auxiliar para extraer N de d.ts
async function extractSizeFromDts(dtsPath) {
    try {
        const dtsCode = await fs.readFile(dtsPath, 'utf8');
        const nMatch = dtsCode.match(/export\s+declare\s+const\s+N\s*=\s*(\d+)\s*;/);
        
        if (!nMatch) throw new Error("No se encontró la constante N en el archivo d.ts");
        return parseInt(nMatch[1], 10);
        
    } catch (err) {
        throw new Error(`Error procesando d.ts: ${err.message}`);
    }
}

// Función auxiliar para extraer N de JSON
async function extractSizeFromJson(jsonPath) {
    try {
        const jsonData = await fs.readFile(jsonPath, 'utf8');
        const contractJson = JSON.parse(jsonData);
        
        const dataPaymentProp = contractJson.stateProps?.find(prop => 
            prop.name === 'dataPayments'
        );

        if (!dataPaymentProp) throw new Error("Propiedad dataPayments no encontrada en JSON");
        
        const sizeMatch = dataPaymentProp.type.match(/\[(\d+)\]/);
        if (!sizeMatch) throw new Error("No se pudo extraer tamaño de dataPayments");
        
        return parseInt(sizeMatch[1], 10);
        
    } catch (err) {
        throw new Error(`Error procesando JSON: ${err.message}`);
    }
}

module.exports = {
    checkCache,
    dirExists,
    fileExists,
    getDataPaymentsSize,
    restoreArtifacts
};
