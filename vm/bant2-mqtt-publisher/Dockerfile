# Bu Dockerfile repo KÖKÜNDEN build edilmelidir (context: .), çünkü @factoredge/sim-core
# workspace paketine ihtiyaç var.
FROM node:20-alpine
WORKDIR /factoredge

COPY packages/sim-core ./packages/sim-core
COPY vm/bant2-mqtt-publisher ./vm/bant2-mqtt-publisher

WORKDIR /factoredge/vm/bant2-mqtt-publisher
RUN npm install --omit=dev

CMD ["node", "node_modules/.bin/tsx", "src/index.ts"]
