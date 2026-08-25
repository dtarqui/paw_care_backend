/**
 * Contrato de la búsqueda global.
 *
 * Cada entidad buscable implementa `SearchProvider` y se registra en
 * `search.service.ts`. Agregar una entidad nueva (medicamentos, citas…) es escribir
 * un proveedor más y sumarlo a la lista — el servicio no cambia.
 *
 * El proveedor decide cómo se representa su entidad en los resultados (título,
 * subtítulo y a qué ruta del frontend navega); quien consume la búsqueda no sabe
 * nada de mascotas ni de propietarios, solo de `SearchResult`.
 */
export interface SearchResult {
  /** Discrimina el tipo para que la UI elija ícono y etiqueta. */
  type: string;
  id: number;
  /** Texto principal del resultado. */
  title: string;
  /** Contexto que desambigua (dueño de la mascota, CI del propietario…). */
  subtitle?: string;
  /** Ruta del frontend a la que navega el resultado. */
  route: string;
}

export interface SearchProvider {
  readonly type: string;
  /** Coincidencia parcial e insensible a mayúsculas, acotada a `limit` resultados. */
  search(term: string, limit: number): Promise<SearchResult[]>;
}
