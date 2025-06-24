# Usa Node.js 20 (usa Alpine para imagen más pequeña)
FROM node:20

# Actualiza npm
RUN npm install -g npm@10.9.0

# Establece directorio de trabajo
WORKDIR /usr/src/app

# 1. Copia SOLO los archivos necesarios para instalar dependencias
COPY package*.json ./
COPY ./payContract/package*.json ./payContract/

# 2. Instala dependencias del root y de payContract
RUN npm install && \
    cd payContract && \
    npm install

# 3. Copia el resto del código (excluyendo lo innecesario)
COPY . .

# 4. Exponer puerto y ejecutar
EXPOSE 8080
CMD ["node", "index.js"]