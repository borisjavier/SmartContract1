# Usa Node.js como base (versión 20)
FROM node:20

# Actualiza npm
RUN npm install -g npm@10.9.0

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json para instalar dependencias primero
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código del proyecto al contenedor
COPY . .

# Cambiar al directorio payContract
WORKDIR /usr/src/app/payContract

# Copiar package.json y package-lock.json de payContract
COPY ./payContract/package*.json ./

# Copiar todos los archivos de pruebas
COPY ./payContract/tests ./tests

# Instalar dependencias de payContract
RUN npm install

# listar todos los archivos de pruebas
RUN ls -R /usr/src/app/payContract

RUN npm i scrypt-cli@0.2.1 --save-dev

# Volver al directorio raíz
WORKDIR /usr/src/app

# Exponer el puerto 8080 para Cloud Run
EXPOSE 8080

# Cambiar el comando CMD para ejecutar index.js en lugar de server.js
CMD [ "node", "index.js" ]
