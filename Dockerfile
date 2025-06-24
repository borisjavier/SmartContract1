# Usa Node.js como base (versión 20)
FROM node:20

# Actualiza npm
RUN npm install -g npm@10.9.0

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 1. Copiar package.json y package-lock.json para instalar dependencias primero
COPY package*.json ./

# 2. Instalar dependencias
RUN npm install

# 3. Copiar configuración de TypeScript
COPY tsconfig.json ./

# 4. Copiar todo el código del proyecto al contenedor
COPY ./payContract ./payContract

# --- PAYCONTRACT ---
# 5. Cambiar al directorio payContract
WORKDIR /usr/src/app/payContract

COPY ./payContract/package*.json ./
RUN npm install


# 6. Volver al directorio raíz
WORKDIR /usr/src/app

# 6. Copiar TODOS los archivos raíz (.js) y otros necesarios
# ¡Esto debe venir después de instalar dependencias!
COPY . .

# --- ESCROWCONTRACT ---
# Cambiar al directorio escrowContract
# WORKDIR /usr/src/app/escrowContract
# Copiar dependencias específicas de escrowContract
# COPY ./escrowContract/package*.json ./
# Instalar dependencias
# RUN npm install
# Copiar código fuente y tests
# COPY ./escrowContract/src ./src
# COPY ./escrowContract/tests ./tests


# 7. Exponer el puerto 8080 para Cloud Run
EXPOSE 8080

# 8. EjecturarCambiar el comando CMD para ejecutar index.js en lugar de server.js
CMD [ "node", "index.ts" ]
