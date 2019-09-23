FROM node:10.16.3-alpine
WORKDIR /var/openKB
COPY package* .
RUN npm install
COPY locales/ ./locales/
COPY public/ ./public/
COPY routes/ ./routes/
COPY views/ .//views/
COPY config/ ./config/
COPY app.js .

VOLUME /var/openKB/data

EXPOSE 4444
ENTRYPOINT ["npm", "start"]