# Usa Node.js 20 (usa Alpine para imagen más pequeña)
FROM node:20-alpine

# Establece directorio de trabajo
WORKDIR /usr/src/app

# Actualiza npm
RUN npm install -g npm@10.9.0

# 1. Copia SOLO los archivos necesarios para instalar dependencias
COPY package*.json ./
COPY ./payContract/package*.json ./payContract/
COPY ./escrowContract/package*.json ./escrowContract/


# 2. Instala dependencias (sin scripts que requieran husky)
RUN npm install --production --ignore-scripts && \
    cd payContract && \
    npm install --production --ignore-scripts && \
    cd ../escrowContract && \
    npm install --production --ignore-scripts

# 3. Copia el resto del código (excluyendo lo innecesario)
COPY . .

# 4. Exponer puerto y ejecutar
EXPOSE 8080
CMD ["node", "index.js"]