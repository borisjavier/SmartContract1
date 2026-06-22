const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs').promises; // Acceso a fs.promises para funciones async

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const USE_MODULE_CACHE = process.env.NODE_MODULE_CACHE !== '0';


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



    // Importación dinámica con limpieza previa
    async function dynamicImport(modulePath) {
        const resolvedPath = require.resolve(modulePath);
        
        // Limpiar específicamente antes de importar
        delete require.cache[resolvedPath];
        console.log(`🔄 Módulo limpiado: ${path.basename(modulePath)}`);
                
        return require(resolvedPath);
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
    dirExists,
    dynamicImport,
    fileExists
};
