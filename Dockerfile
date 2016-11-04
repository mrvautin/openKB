FROM node:7

WORKDIR /var/openKB

COPY locales/ /var/openKB/locales/
COPY public/ /var/openKB/public/
COPY routes/ /var/openKB/routes/
COPY views/ /var/openKB/views/
COPY app.js /var/openKB/
COPY package.json /var/openKB/

RUN npm install

VOLUME /var/openKB/data

EXPOSE 4444

ENTRYPOINT node app.js
