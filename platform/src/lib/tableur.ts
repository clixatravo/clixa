import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * Écrire un vrai classeur Excel, sans la moindre dépendance.
 *
 * ── ⚠️ Pourquoi pas un CSV ──────────────────────────────────────────────────
 * Le fichier des admissions **était** un CSV, et il ne pouvait pas être ce que
 * la direction en demande : « que n'importe qui le comprenne, que tout soit
 * expliqué, que chaque chose soit à sa place ». Un CSV n'a ni en-tête figée, ni
 * largeur de colonne, ni type — tout y est du texte, y compris les montants
 * qu'on voudrait additionner et les dates qu'on voudrait trier.
 *
 * Surtout, un CSV n'a **qu'une table**. Les inscriptions et les demandes de
 * rappel étaient donc empilées dans la même, avec une colonne « Type » pour
 * les distinguer et des colonnes dont le sens changeait d'une ligne à
 * l'autre — « Montant / Échéances » portait « 0 EUR réglé(s) » sur les unes et
 * « Pays : Maroc » sur les autres. C'est exactement le contraire de « chaque
 * chose à sa place ».
 *
 * ── ⚠️ Pourquoi pas une bibliothèque ────────────────────────────────────────
 * Un `.xlsx` est une archive ZIP contenant quelques fichiers XML. Node sait
 * déjà tout faire : `deflateRawSync` compresse, `crc32` signe. Ajouter une
 * bibliothèque de tableur pour cela pèserait plus que ce fichier entier, sur
 * une fonction serverless dont le paquet est facturé au démarrage.
 *
 * ⚠️ **Ce qui est écrit ici est le strict nécessaire**, et c'est voulu : pas de
 * formules, pas de graphiques, pas de `sharedStrings`. Le jour où il faudra
 * l'un des trois, une bibliothèque sera le bon choix — pas l'extension de
 * celui-ci.
 */

/** Ce qu'une cellule peut porter. `undefined` laisse la cellule vide. */
export type Valeur = string | number | Date | undefined;

export type Colonne = {
  entete: string;
  /** Largeur en « caractères », l'unité d'Excel. */
  largeur: number;
};

export type Feuille = {
  /** ⚠️ Excel refuse `: \ / ? * [ ]` et plus de 31 caractères. */
  nom: string;
  colonnes: Colonne[];
  lignes: Valeur[][];
};

/* ── Les styles, dans l'ordre où `styles.xml` les déclare ─────────────────── */
const STYLE_NORMAL = 0;
const STYLE_ENTETE = 1;
const STYLE_DATE = 2;
const STYLE_EURO = 3;

/** Les caractères que XML n'accepte pas tels quels. */
function echapper(v: string): string {
  return (
    v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      /*
      ⚠️ Les caractères de contrôle rendent le fichier illisible — Excel refuse
      de l'ouvrir en bloc, sans dire lequel gêne. Ils n'ont rien à faire dans un
      nom ou une adresse, mais ceux-ci viennent d'un formulaire public.
    */
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  );
}

/** « A », « B »… « AA ». Excel numérote ses colonnes en base 26 sans zéro. */
function lettre(index: number): string {
  let n = index + 1;
  let sortie = "";
  while (n > 0) {
    const reste = (n - 1) % 26;
    sortie = String.fromCharCode(65 + reste) + sortie;
    n = Math.floor((n - reste) / 26);
  }
  return sortie;
}

/**
 * Une date au compte des jours d'Excel.
 *
 * ⚠️ **L'origine est le 30 décembre 1899, pas le 1er janvier 1900.** Excel
 * reproduit un bogue de Lotus 1-2-3 qui tient 1900 pour bissextile ; décaler
 * l'origine d'un jour est la façon usuelle de retomber juste. Un jour d'écart
 * ne se remarque pas à la lecture et fausse tous les tris par date.
 */
function serieExcel(d: Date): number {
  return (d.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
}

function cellule(v: Valeur, ref: string, entete: boolean): string {
  if (entete)
    return `<c r="${ref}" s="${STYLE_ENTETE}" t="inlineStr"><is><t>${echapper(String(v ?? ""))}</t></is></c>`;
  if (v === undefined || v === "") return "";
  if (v instanceof Date) return `<c r="${ref}" s="${STYLE_DATE}"><v>${serieExcel(v)}</v></c>`;
  if (typeof v === "number") return `<c r="${ref}" s="${STYLE_EURO}"><v>${v}</v></c>`;
  /*
    ⚠️ `inlineStr` plutôt qu'une table de chaînes partagées. Celle-ci économise
    de la place quand les mêmes mots reviennent souvent ; ici les cellules sont
    des noms et des adresses, presque toutes différentes, et la table ajouterait
    un fichier et un index à tenir juste pour rien.
  */
  return `<c r="${ref}" s="${STYLE_NORMAL}" t="inlineStr"><is><t xml:space="preserve">${echapper(v)}</t></is></c>`;
}

function feuilleXml(f: Feuille): string {
  const cols = f.colonnes
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.largeur}" customWidth="1"/>`)
    .join("");

  const enTete = `<row r="1" ht="22" customHeight="1">${f.colonnes
    .map((c, i) => cellule(c.entete, `${lettre(i)}1`, true))
    .join("")}</row>`;

  const corps = f.lignes
    .map((ligne, l) => {
      const r = l + 2;
      const cellules = ligne.map((v, i) => cellule(v, `${lettre(i)}${r}`, false)).join("");
      return `<row r="${r}">${cellules}</row>`;
    })
    .join("");

  const derniere = `${lettre(Math.max(f.colonnes.length - 1, 0))}${f.lignes.length + 1}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0">
<!--
  ⚠️ L'en-tête reste visible au défilement, et le filtre est posé d'avance.
  Sans eux, on lit une colonne sans savoir laquelle dès la vingtième ligne —
  et c'est précisément le fichier qu'on parcourt sur cent lignes.
-->
<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${enTete}${corps}</sheetData>
<autoFilter ref="A1:${derniere}"/>
</worksheet>`;
}

/* ── L'archive ZIP, à la main ──────────────────────────────────────────────── */

type Entree = { nom: string; contenu: Buffer };

/**
 * Assembler un ZIP, sans dépendance.
 *
 * ⚠️ Chaque entrée est écrite **deux fois** : une fois en tête de son contenu,
 * une fois dans l'index de fin. Les deux doivent porter les mêmes tailles et le
 * même CRC — un fichier dont l'index ment s'ouvre chez les uns et pas chez les
 * autres, ce qui est la pire des deux façons d'être cassé.
 */
function zip(entrees: Entree[]): Buffer {
  const morceaux: Buffer[] = [];
  const index: Buffer[] = [];
  let decalage = 0;

  for (const e of entrees) {
    const nom = Buffer.from(e.nom, "utf8");
    const compresse = deflateRawSync(e.contenu);
    const somme = crc32(e.contenu);

    const enTete = Buffer.alloc(30);
    enTete.writeUInt32LE(0x04034b50, 0);
    enTete.writeUInt16LE(20, 4); // version minimale
    enTete.writeUInt16LE(0x0800, 6); // noms en UTF-8
    enTete.writeUInt16LE(8, 8); // deflate
    enTete.writeUInt32LE(somme, 14);
    enTete.writeUInt32LE(compresse.length, 18);
    enTete.writeUInt32LE(e.contenu.length, 22);
    enTete.writeUInt16LE(nom.length, 26);

    morceaux.push(enTete, nom, compresse);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(somme, 16);
    central.writeUInt32LE(compresse.length, 20);
    central.writeUInt32LE(e.contenu.length, 24);
    central.writeUInt16LE(nom.length, 28);
    central.writeUInt32LE(decalage, 42);
    index.push(central, nom);

    decalage += enTete.length + nom.length + compresse.length;
  }

  const corps = Buffer.concat(morceaux);
  const repertoire = Buffer.concat(index);

  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entrees.length, 8);
  fin.writeUInt16LE(entrees.length, 10);
  fin.writeUInt32LE(repertoire.length, 12);
  fin.writeUInt32LE(corps.length, 16);

  return Buffer.concat([corps, repertoire, fin]);
}

/**
 * Un classeur, une feuille par table.
 *
 * ⚠️ **Une feuille par nature de donnée**, jamais deux tables empilées. C'est
 * toute la raison d'être de ce fichier : des inscriptions et des demandes de
 * rappel n'ont pas les mêmes colonnes, et les forcer dans les mêmes en donne
 * dont le sens change d'une ligne à l'autre.
 */
export function classeur(feuilles: Feuille[]): Buffer {
  const t = (s: string) => Buffer.from(s, "utf8");

  const onglets = feuilles
    .map((f, i) => `<sheet name="${echapper(f.nom)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("");

  const liens = feuilles
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("");

  const types = feuilles
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  return zip([
    {
      nom: "[Content_Types].xml",
      contenu: t(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${types}
</Types>`),
    },
    {
      nom: "_rels/.rels",
      contenu: t(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      nom: "xl/workbook.xml",
      contenu: t(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${onglets}</sheets>
</workbook>`),
    },
    {
      nom: "xl/_rels/workbook.xml.rels",
      contenu: t(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${liens}
<Relationship Id="rId${feuilles.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    {
      /*
        ⚠️ **L'ordre compte, et rien ne le signale.** Excel désigne police,
        remplissage, bordure et format par leur *rang* dans ces listes. Les
        deux premiers remplissages sont imposés par le format — `none` et
        `gray125` — et insérer le nôtre avant eux ferait ouvrir un fichier aux
        couleurs déplacées, sans erreur.
      */
      nom: "xl/styles.xml",
      contenu: t(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="165" formatCode="#,##0.00\\ &quot;€&quot;"/>
</numFmts>
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF0A0F1E"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC9A24C"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>`),
    },
    ...feuilles.map((f, i) => ({
      nom: `xl/worksheets/sheet${i + 1}.xml`,
      contenu: t(feuilleXml(f)),
    })),
  ]);
}

/**
 * Relire un classeur qu'on vient d'écrire — pour les épreuves, et pour elles
 * seules.
 *
 * ⚠️ **Un `.xlsx` cassé ne casse rien d'autre.** La route répond 200, le
 * fichier a la bonne taille et la bonne extension, et Excel affiche « le format
 * est incorrect » sans dire lequel des sept fichiers XML gêne. Aucun type,
 * aucune compilation, aucune épreuve de parcours ne verrait passer cela : le
 * seul contrôle qui vaille est d'ouvrir l'archive et de regarder dedans.
 *
 * Il vit ici plutôt que dans un script parce que **deux scripts en ont
 * besoin** — celui du classeur et celui des portes — et qu'un lecteur de ZIP
 * recopié est un lecteur de ZIP qui divergera.
 *
 * ⚠️ **On relit par l'index de fin**, pas en déroulant les en-têtes : c'est ce
 * que fait un vrai lecteur, et c'est là que les deux copies de chaque entrée
 * doivent s'accorder. Un fichier dont l'index ment s'ouvre chez les uns et pas
 * chez les autres — la pire des deux façons d'être cassé.
 */
export function lireClasseur(buf: Buffer): Map<string, string> {
  const fichiers = new Map<string, string>();
  const fin = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (fin < 0) return fichiers;

  const nombre = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);

  for (let i = 0; i < nombre; i += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return fichiers;
    const compresse = buf.readUInt32LE(p + 20);
    const brut = buf.readUInt32LE(p + 24);
    const longueurNom = buf.readUInt16LE(p + 28);
    const debut = buf.readUInt32LE(p + 42);
    const nom = buf.subarray(p + 46, p + 46 + longueurNom).toString("utf8");

    const nomLocal = buf.readUInt16LE(debut + 26);
    const extraLocal = buf.readUInt16LE(debut + 28);
    const donnees = buf.subarray(
      debut + 30 + nomLocal + extraLocal,
      debut + 30 + nomLocal + extraLocal + compresse,
    );
    /*
      ⚠️ `inflateRaw`, pas `unzip`. Un ZIP stocke du deflate **brut**, sans
      l'en-tête de deux octets que `unzip` attend : le premier jet échouait sur
      « incorrect header check » en accusant un fichier parfaitement bon.
    */
    const contenu = inflateRawSync(donnees);
    if (contenu.length !== brut) return fichiers;
    fichiers.set(nom, contenu.toString("utf8"));
    p += 46 + longueurNom + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return fichiers;
}
