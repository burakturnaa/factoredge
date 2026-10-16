import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`factorEdge API listening on http://localhost:${port}`);
});
