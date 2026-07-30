import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { usuarioRepository } from "../repositories/usuario.repository";
import { UsuarioPublico } from "../types";

const JWT_SECRET = process.env.JWT_SECRET ?? "demo-secret-cambiar-en-produccion";
const JWT_EXPIRES_IN = "8h";

export class CredencialesInvalidasError extends Error {
  constructor() {
    super("Usuario o contraseña incorrectos");
    this.name = "CredencialesInvalidasError";
  }
}

function aPublico(usuario: { password: string } & UsuarioPublico): UsuarioPublico {
  const { password: _password, ...publico } = usuario;
  return publico;
}

export const authService = {
  async login(username: string, password: string): Promise<{ token: string; usuario: UsuarioPublico }> {
    const usuario = await usuarioRepository.findByUsername(username);
    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      // Mensaje genérico a propósito: no revela si falló el usuario o la contraseña (HU1).
      throw new CredencialesInvalidasError();
    }
    const publico = aPublico(usuario);
    const token = jwt.sign(
      { sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { token, usuario: publico };
  },

  verificarToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as unknown as { sub: number; rol: string; nombre: string };
  },
};
