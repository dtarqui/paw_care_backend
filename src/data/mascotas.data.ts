// Registro "crudo" tal como se guarda internamente: por propietarioId (FK), no con
// el propietario embebido — así se puede crear una mascota nueva reutilizando un
// propietario existente sin duplicar datos. El repositorio la "hidrata" al leerla.
export interface MascotaRegistro {
  id: number;
  propietarioId: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: "Macho" | "Hembra";
  fechaNacimiento: string;
  peso: number;
}

export const mascotas: MascotaRegistro[] = [
  { id: 1, propietarioId: 1, nombre: "Coco", especie: "Perro", raza: "San Bernardo", sexo: "Macho", fechaNacimiento: "2025-05-22", peso: 15.5 },
  { id: 2, propietarioId: 2, nombre: "Billy", especie: "Perro", raza: "Golden Retriever", sexo: "Macho", fechaNacimiento: "2025-04-10", peso: 10.2 },
  { id: 3, propietarioId: 1, nombre: "Rally", especie: "Perro", raza: "Golden Retriever", sexo: "Macho", fechaNacimiento: "2024-05-16", peso: 25.5 },
  { id: 4, propietarioId: 1, nombre: "Tom", especie: "Gato", raza: "Angora", sexo: "Hembra", fechaNacimiento: "2025-06-04", peso: 5.6 },
  { id: 5, propietarioId: 1, nombre: "Tommy", especie: "Perro", raza: "Golden Retriever", sexo: "Hembra", fechaNacimiento: "2025-06-01", peso: 15.8 },
];
