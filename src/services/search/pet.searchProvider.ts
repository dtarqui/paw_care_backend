import { petRepository } from "../../repositories/pet.repository";
import type { SearchProvider, SearchResult } from "./searchProvider";

/** Busca mascotas por nombre. El subtítulo trae al dueño, que es lo que desambigua
 * cuando dos mascotas se llaman igual (pasa seguido con "Luna" o "Rocky"). */
export const petSearchProvider: SearchProvider = {
  type: "pet",

  async search(term: string, limit: number): Promise<SearchResult[]> {
    const pets = await petRepository.searchByName(term, limit);
    return pets.map((pet) => ({
      type: "pet",
      id: pet.id,
      title: pet.name,
      subtitle: `${pet.species} · ${pet.owner.firstName} ${pet.owner.paternalLastName}`,
      route: `/app/pets/${pet.id}`,
    }));
  },
};
