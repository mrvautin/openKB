FROM node:10.16.3-alpine as builder
RUN apk --no-cache add python make g++
WORKDIR /var/openKB
COPY package* .
RUN npm install

FROM node:10.16.3-alpine
WORKDIR /var/openKB
COPY package.json .
COPY locales/ locales/
COPY public/ public/
COPY routes/ routes/
COPY views/ views/
COPY config/ config/
COPY app.js .
COPY --from=builder /var/openKB/node_modules node_modules

VOLUME /var/openKB/data

EXPOSE 4444
ENTRYPOINT ["npm", "start"]
