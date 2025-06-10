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

# 3. Copiar todo el código del proyecto al contenedor
COPY ./payContract ./payContract

# --- PAYCONTRACT ---
# 4. Cambiar al directorio payContract
WORKDIR /usr/src/app/payContract

COPY ./payContract/package*.json ./


# Copiar package.json y package-lock.json de payContract
# COPY ./payContract/package*.json ./

# Instalar dependencias de payContract
RUN npm install

# 5. Volver al directorio raíz
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


# Verificar estructura de archivos (opcional, solo para debug)
RUN ls -lR /usr/src/app

# 8. Ejecutar la aplicación.
CMD [ "node", "index.js" ]
