import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT ?? 4000);

const app = createApp();

app.listen(PORT, () => {
  console.log(`PawCare backend escuchando en http://localhost:${PORT}`);
  const delay = Number(process.env.DEMO_DELAY_MS ?? 0);
  if (delay > 0) console.log(`Latencia artificial adicional: ${delay}ms por request`);
});
