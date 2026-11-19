// Letras cirilicas y griegas que se ven identicas a las latinas ("homoglifos").
// Un atacante las usa para que "sеcreto" (con е cirilica) no coincida con las
// reglas. NFKD no las convierte, asi que se mapean a mano. Lo usan Capa 1 y Capa 2.
const MAPA = {
  // cirilico
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c",
  т: "t", у: "y", х: "x", ѕ: "s", і: "i", ї: "i", ј: "j", ԁ: "d", ԛ: "q", ԝ: "w",
  А: "A", В: "B", Е: "E", Ё: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C",
  Т: "T", У: "Y", Х: "X", Ѕ: "S", І: "I", Ј: "J",
  // griego
  α: "a", ε: "e", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x",
  Α: "A", Β: "B", Ε: "E", Ζ: "Z", Η: "H", Ι: "I", Κ: "K", Μ: "M", Ν: "N", Ο: "O",
  Ρ: "P", Τ: "T", Υ: "Y", Χ: "X",
};
const PATRON = new RegExp(`[${Object.keys(MAPA).join("")}]`, "g");

const quitarConfusibles = (texto) => texto.replace(PATRON, (c) => MAPA[c]);

module.exports = { quitarConfusibles };
