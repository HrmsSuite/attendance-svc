FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./

ARG NPM_TOKEN
RUN sed -i "s|\${NPM_TOKEN}|$NPM_TOKEN|g" .npmrc

RUN npm install

COPY . .

EXPOSE 8002

CMD ["npm", "run", "dev"]