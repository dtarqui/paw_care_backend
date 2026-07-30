import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT ?? 4000);

const app = createApp();

app.listen(PORT, () => {
  console.log(`PawCare backend (modo demo) escuchando en http://localhost:${PORT}`);
  console.log(`Latencia simulada: ${process.env.DEMO_DELAY_MS ?? 700}ms por request`);
});
