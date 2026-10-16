import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { connectorManager } from "./connectors/manager-instance.js";
import { authRouter } from "./routes/auth.routes.js";
import { devicesRouter } from "./routes/devices.routes.js";
import { readingsRouter } from "./routes/readings.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { createSocketGateway } from "./ws/socket-gateway.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/readings", readingsRouter);
app.use("/api/users", usersRouter);

const httpServer = http.createServer(app);
createSocketGateway(httpServer);

// Platform bir connector'daki hatadan dolayı çökmemeli — kesinti davranışı gereksinimi.
process.on("unhandledRejection", (err) => console.error("[unhandledRejection]", err));
process.on("uncaughtException", (err) => console.error("[uncaughtException]", err));

const port = Number(process.env.PORT ?? 3000);

await connectorManager.loadAllFromDb();

httpServer.listen(port, () => {
  console.log(`factorEdge API dinleniyor: http://localhost:${port}`);
});
