import { Request } from "express";
import { DEFAULT_PAPER_SIZE, isContinuous, readPaperSize } from "./paperSize";

function request(paper?: unknown): Request {
  return { query: paper === undefined ? {} : { paper } } as unknown as Request;
}

describe("readPaperSize", () => {
  it("acepta los tamaños conocidos", () => {
    expect(readPaperSize(request("ticket-80mm"))).toBe("ticket-80mm");
    expect(readPaperSize(request("a4"))).toBe("a4");
  });

  it("cae al tamaño por defecto si no viene o no se reconoce", () => {
    // El valor llega de la query: puede ser cualquier cosa, y una descarga no puede
    // romperse por un localStorage viejo o manipulado a mano.
    expect(readPaperSize(request())).toBe(DEFAULT_PAPER_SIZE);
    expect(readPaperSize(request("A4"))).toBe(DEFAULT_PAPER_SIZE);
    expect(readPaperSize(request("oficio"))).toBe(DEFAULT_PAPER_SIZE);
    expect(readPaperSize(request(["a4", "letter"]))).toBe(DEFAULT_PAPER_SIZE);
  });

  it("media carta es el tamaño por defecto", () => {
    expect(DEFAULT_PAPER_SIZE).toBe("half-letter");
  });
});

describe("isContinuous", () => {
  it("solo el rollo térmico es papel continuo", () => {
    expect(isContinuous("ticket-80mm")).toBe(true);
    expect(isContinuous("half-letter")).toBe(false);
    expect(isContinuous("letter")).toBe(false);
    expect(isContinuous("a4")).toBe(false);
  });
});
