# Bu Dockerfile repo KÖKÜNDEN build edilmelidir (context: .), çünkü @factoredge/sim-core
# workspace paketine ihtiyaç var: docker compose build context ".." (vm/'den bakınca repo kökü).
FROM node:20-alpine
WORKDIR /factoredge

COPY packages/sim-core ./packages/sim-core
COPY vm/bant1-modbus ./vm/bant1-modbus

WORKDIR /factoredge/vm/bant1-modbus
RUN npm install --omit=dev

ENV PORT=5020
EXPOSE 5020

CMD ["node", "node_modules/.bin/tsx", "src/index.ts"]
