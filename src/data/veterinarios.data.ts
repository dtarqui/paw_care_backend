import { Veterinario } from "../types";

export const veterinarios: Veterinario[] = [
  { id: 1, nombre: "Carlos", apellidoPaterno: "Andrade", matricula: "VET-011", especialidad: "Medicina General" },
  // usuarioId: 2 -> Usuario "veterinario/vet123" (ver usuarios.data.ts): es el único veterinario
  // con cuenta de acceso en el modo demo, por eso es el que puede iniciar sesión y agendar para sí mismo.
  { id: 2, usuarioId: 2, nombre: "Luis", apellidoPaterno: "Fernández", matricula: "VET-003", especialidad: "Dermatología" },
  { id: 3, nombre: "María", apellidoPaterno: "Rodríguez", matricula: "VET-004", especialidad: "Cirugía" },
];
