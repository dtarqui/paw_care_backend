import { renderOnPaper } from "./pdfPaper";
import { PaperSize } from "../utils/paperSize";

/** Escribe `lines` renglones, para que el alto del documento dependa del contenido. */
function draw(lines: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc: any) => {
    for (let i = 0; i < lines; i++) doc.text(`Renglón ${i + 1}`);
  };
}

function pageSize(paper: PaperSize, lines: number) {
  const doc = renderOnPaper(paper, draw(lines));
  const { width, height } = doc.page;
  doc.end();
  return { width, height };
}

describe("renderOnPaper", () => {
  it("respeta el alto fijo de una hoja, tenga poco o mucho contenido", () => {
    expect(pageSize("letter", 3).height).toBe(792);
    expect(pageSize("letter", 40).height).toBe(792);
    expect(pageSize("half-letter", 3).height).toBe(612);
  });

  it("en papel continuo el alto lo define el contenido", () => {
    const corto = pageSize("ticket-80mm", 3);
    const largo = pageSize("ticket-80mm", 40);

    expect(corto.width).toBeCloseTo(226.77, 2);
    expect(largo.height).toBeGreaterThan(corto.height);
    // Y no sale el rollo entero: un ticket de 3 renglones no llega ni a media carta.
    expect(corto.height).toBeLessThan(612);
  });

  it("nunca devuelve un papel más corto que el mínimo imprimible", () => {
    expect(pageSize("ticket-80mm", 0).height).toBeGreaterThanOrEqual(120);
  });
});
