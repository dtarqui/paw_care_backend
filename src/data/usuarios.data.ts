import { Usuario } from "../types";

// Credenciales de demo — visibles a propósito para que cualquiera pueda probar la app.
export const usuarios: Usuario[] = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    nombre: "Ana",
    apellidoPaterno: "García",
    ci: "1234567",
    rol: "ADMINISTRADOR",
    estado: "ACTIVO",
  },
  {
    id: 2,
    username: "veterinario",
    password: "vet123",
    nombre: "Luis",
    apellidoPaterno: "Fernández",
    ci: "2345678",
    rol: "VETERINARIO",
    estado: "ACTIVO",
  },
  {
    id: 3,
    username: "recepcion",
    password: "recepcion123",
    nombre: "Sofía",
    apellidoPaterno: "Rojas",
    ci: "3456789",
    rol: "RECEPCIONISTA",
    estado: "ACTIVO",
  },
];
