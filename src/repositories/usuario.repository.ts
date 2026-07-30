import { usuarios } from "../data/usuarios.data";
import { Usuario } from "../types";

export const usuarioRepository = {
  findByUsername(username: string): Usuario | undefined {
    return usuarios.find((u) => u.username === username);
  },

  findById(id: number): Usuario | undefined {
    return usuarios.find((u) => u.id === id);
  },

  findByCi(ci: string): Usuario | undefined {
    return usuarios.find((u) => u.ci === ci);
  },

  findAll(): Usuario[] {
    return usuarios;
  },

  create(usuario: Usuario): Usuario {
    usuarios.push(usuario);
    return usuario;
  },

  nextId(): number {
    return Math.max(0, ...usuarios.map((u) => u.id)) + 1;
  },
};
