import { ownerRepository } from "../../repositories/owner.repository";
import type { SearchProvider, SearchResult } from "./searchProvider";

/** Busca propietarios por nombre, apellido o CI — las tres formas en que
 * recepción identifica a un cliente en el mostrador. */
export const ownerSearchProvider: SearchProvider = {
  type: "owner",

  async search(term: string, limit: number): Promise<SearchResult[]> {
    const owners = await ownerRepository.searchByNameOrNationalId(term, limit);
    return owners.map((owner) => ({
      type: "owner",
      id: owner.id,
      title: `${owner.firstName} ${owner.paternalLastName}`,
      subtitle: `CI ${owner.nationalId}`,
      route: "/app/owners",
    }));
  },
};
