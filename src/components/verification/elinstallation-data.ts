export interface ChecklistItem {
  id: string;
  question: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export const checklistSections: ChecklistSection[] = [
  {
    id: "generelt",
    title: "1. Generelt",
    items: [
      { id: "g1", question: "Er der taget hensyn til ydre påvirkninger og anvendt korrekt kapslingsklasse?" },
      { id: "g2", question: "Er der brandtætnet ved gennemføringer?" },
      { id: "g3", question: "Er installationen isolationsprøvet?" },
      { id: "g4", question: "Er der foretaget polaritetsprøve og kontrol af fasefølgen?" },
      { id: "g5", question: "Er der foretaget funktionsprøver af installationen?" },
      { id: "g6", question: "Er nul- og beskyttelsesledere korrekt identificeret?" },
      { id: "g7", question: "Er ledere korrekt overstrømsbeskyttet og valgt efter strømværdi?" },
      { id: "g8", question: "Er SPD'er (overspændingsbeskyttelsesudstyr) korrekt valgt og installeret?" },
      { id: "g9", question: "Er permanent tilsluttede brugsgenstande egnet til den pågældende anvendelse?" },
      { id: "g10", question: "Er nødvendig dokumentation til stede?" },
      { id: "g11", question: "Er spændingsfald kontrolleret?" },
      { id: "g12", question: "Er der foretaget foranstaltninger mod elektromagnetiske påvirkninger?" },
      { id: "g13", question: "Er ejer/bruger informeret om funktion og betjening?" },
    ],
  },
  {
    id: "tavlen",
    title: "2. Tavlen",
    items: [
      { id: "t1", question: "Er der tilstrækkelig plads til at arbejde på/adgang til tavlen?" },
      { id: "t2", question: "Er overstrømsbeskyttelsesudstyr korrekt valgt og evt. indstillet?" },
      { id: "t3", question: "Er der en entydig mærkning af beskyttelsesudstyr med tilhørsforhold?" },
      { id: "t4", question: "Er der mærkning om max. mærke-/indstillingsstrøm?" },
      { id: "t5", question: "Er mærkning med oplysninger om tekniske data for tavlen foretaget?" },
      { id: "t6", question: "Er udgående beskyttelsesledere anbragt i separate klemmer i tavlen?" },
      { id: "t7", question: "Er afdækning og dækplader monteret?" },
      { id: "t8", question: "Er indføringer tilpasset/tætnet, så tavlens kapslingsklasse er som mærket?" },
    ],
  },
  {
    id: "installation",
    title: "3. Installation",
    items: [
      { id: "i1", question: "Er udstyr til adskillelse og afbrydelse korrekt valgt, placeret og installeret?" },
      { id: "i2", question: "Er stikkontakter og udtag m.m. installeret i henhold til gældende bestemmelser?" },
      { id: "i3", question: "Er kabler/ledninger korrekt oplagt, afsluttet og forbundet?" },
      { id: "i4", question: "Er kabler beskyttet mod mekanisk overlast ved opføringer fra gulv/jord?" },
      { id: "i5", question: "Er tilledninger aflastet for træk og vridning ved tilslutning til installationen?" },
      { id: "i6", question: "Er alle dæksler og afdækninger monteret, så der ikke er berøringsfare?" },
      { id: "i7", question: "Er alle samlinger let tilgængelige?" },
    ],
  },
  {
    id: "indbygning",
    title: "4. Indbygningsarmaturer",
    items: [
      { id: "a1", question: "Er indbygningsarmaturer korrekt valgt og monteret?" },
      { id: "a2", question: "Er indbygningsarmaturer installeret således, at overophedning undgås?" },
    ],
  },
  {
    id: "beskyttelse",
    title: "5. Beskyttelsesledere og udligningsforbindelser",
    items: [
      { id: "b1", question: "Er jordingslederen korrekt valgt (minimum 6 mm²)?" },
      { id: "b2", question: "Er der etableret beskyttende potentialudligning?" },
      { id: "b3", question: "Er supplerende beskyttende potentialudligning etableret?" },
      { id: "b4", question: "Er den gennemgående forbindelse i udligningsforbindelser kontrolleret?" },
      { id: "b5", question: "Er den gennemgående forbindelse i beskyttelsesledere kontrolleret?" },
      { id: "b6", question: "Er overgangsmodstand for jordelektroden kontrolleret?" },
    ],
  },
  {
    id: "fejlbeskyttelse",
    title: "6. Fejlbeskyttelse / supplerende beskyttelse",
    items: [
      { id: "f1", question: "Er beskyttelsesmetode korrekt valgt i forhold til installationstype og systemjording?" },
      { id: "f2", question: "Er RCD'er (fejlstrømsafbrydere) kontrolleret og afprøvet?" },
      { id: "f3", question: "Er klasse I brugsgenstande tilsluttet til beskyttelseslederen?" },
    ],
  },
];

export interface KredsRow {
  gruppe: string;
  ob: string;
  karakteristik: string;
  tvaersnit: string;
  maksOb: string;
  zs: string;
  ra: string;
  isolation: string;
}

export interface RcdRow {
  rcd: string;
  sinus0: string;
  sinus180: string;
  sinus5x: string;
  puls0half: string;
  puls0: string;
  puls180: string;
  proveknap: string;
}

export interface KortslutRow {
  gruppe: string;
  ik: string;
  maaltPunkt: string;
}

export interface SpændingsfaldRow {
  gruppe: string;
  u: string;
  maaltPunkt: string;
}

export const emptyKredsRow = (): KredsRow => ({
  gruppe: "", ob: "", karakteristik: "", tvaersnit: "", maksOb: "", zs: "", ra: "", isolation: "",
});

export const emptyRcdRow = (): RcdRow => ({
  rcd: "", sinus0: "", sinus180: "", sinus5x: "", puls0half: "", puls0: "", puls180: "", proveknap: "",
});

export const emptyKortslutRow = (): KortslutRow => ({
  gruppe: "", ik: "", maaltPunkt: "",
});

export const emptySpændingsfaldRow = (): SpændingsfaldRow => ({
  gruppe: "", u: "", maaltPunkt: "",
});
