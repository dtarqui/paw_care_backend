import "dotenv/config";
import { createApp } from "../src/app";

// Punto de entrada para el runtime serverless de Vercel: exporta la instancia de
// Express directamente (sin .listen()) — Express ya es un handler (req, res) válido.
// El desarrollo local sigue usando src/index.ts (que sí llama a .listen()).
export default createApp();
