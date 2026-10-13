import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(
  await readFile(path.join(root, "research", "registry-snapshots", "dog-registries-2026-10-13.json"), "utf8")
);
const currentDocument = JSON.parse(await readFile(path.join(root, "species", "dog", "breeds.json"), "utf8"));

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalize(value).replaceAll(" ", "-");
}

function titleCase(value) {
  if (value !== value.toUpperCase()) return value;
  const lowerWords = new Set(["and", "de", "des", "do", "of"]);
  return value
    .toLocaleLowerCase("en")
    .replace(/(^|[\s/-])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
    .split(" ")
    .map((word, index) => index > 0 && lowerWords.has(word) ? word : word)
    .join(" ");
}

function levenshtein(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[right.length];
}

function similarity(left, right) {
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - levenshtein(left, right) / longest;
}

const overrides = new Map(Object.entries({
  "american black and tan coonhound": "black-and-tan-coonhound",
  "american cocker spaniel": "cocker-spaniel",
  "american english coonhound": "american-english-coonhound",
  "english coonhound": "american-english-coonhound",
  "american eskimo": "american-eskimo-dog",
  "aidi atlas mountain dog": "aidi",
  "atlas mountain dog aidi": "aidi",
  "anatolian shepherd": "anatolian-shepherd-dog",
  "appenzell cattle dog": "appenzeller-sennenhund",
  "appenzeller": "appenzeller-sennenhund",
  "appenzeller sennenhunde": "appenzeller-sennenhund",
  "akita japanese": "akita",
  "alpine drachsbracke": "alpine-dachsbracke",
  "alpine dachsbracke": "alpine-dachsbracke",
  "australian silky terrier": "silky-terrier",
  "australian stumpy tail cattle dog": "australian-stumpy-tail-cattle-dog",
  "stumpy tail cattle dog": "australian-stumpy-tail-cattle-dog",
  "abruzzes and maremma shepherd dog": "maremma-sheepdog",
  "alentejo mastiff": "rafeiro-do-alentejo",
  "beauce sheepdog": "beauceron",
  "beauceron berger de beauce": "beauceron",
  "beorboel": "boerboel",
  "belgian shepherd dog groenendael": "belgian-sheepdog",
  "belgian shepherd dog laekenois": "belgian-laekenois",
  "belgian shepherd dog malinois": "belgian-malinois",
  "belgian shepherd dog tervueren": "belgian-tervuren",
  "bergamasco": "bergamasco-sheepdog",
  "bergamasco shepherd": "bergamasco-sheepdog",
  "bergamasco shepherd dog": "bergamasco-sheepdog",
  "berger des pyrenees": "pyrenean-shepherd",
  "black forest hound slovakian hound": "slovensky-kopov",
  "blue gascony basset": "basset-bleu-de-gascogne",
  "blue gascony griffon": "griffon-bleu-de-gascogne",
  "bohemian wire haired pointing griffon": "cesky-fousek",
  "bohemian shepherd dog": "bohemian-shepherd",
  "bosnian broken haired hound called barak": "barak",
  "bourbonnais pointing dog": "braque-du-bourbonnais",
  "burgos pointing dog": "perdiguero-de-burgos",
  "ariege pointing dog": "braque-de-l-ariege",
  "braque de l ariege": "braque-de-l-ariege",
  "braque francais pyrenean": "braque-francais-de-petite-taille",
  "braque francais de petite taille": "braque-francais-de-petite-taille",
  "artois hound": "artois-hound",
  "auvergne pointer": "braque-d-auvergne",
  "borzoi russian hunting sighthound": "borzoi",
  "british bulldog": "bulldog",
  "brittany spaniel": "brittany",
  "bull terrier miniature": "miniature-bull-terrier",
  "cane corso italiano": "cane-corso",
  "catahoula leopard dog": "catahoula-leopard-dog",
  "central asian shepherd": "central-asian-shepherd-dog",
  "chinese crested dog": "chinese-crested",
  "chihuahua long coat": "chihuahua",
  "chihuahua short coat": "chihuahua",
  "chihuahua smooth coat": "chihuahua",
  "chow chow smooth": "chow-chow",
  "cocker spaniel american": "cocker-spaniel",
  "castro laboreiro dog": "cao-de-castro-laboreiro",
  "catalan sheepdog": "catalonian-sheepdog",
  "caucasian ovcharka": "caucasian-shepherd-dog",
  "chien d artois": "artois-hound",
  "ciobanesc romanesc carpatin": "romanian-carpathian-shepherd",
  "ciobanesc romanesc mioritic": "romanian-mioritic-shepherd-dog",
  "coarse haired styrian hound": "styrian-coarse-haired-hound",
  "styrian coarse haired hound": "styrian-coarse-haired-hound",
  "croatian shepherd dog": "croatian-sheepdog",
  "collie rough": "collie",
  "collie smooth": "collie",
  "coonhound black and tan": "black-and-tan-coonhound",
  "continental toy spaniel": "papillon",
  "czechoslovakian vlcak czechoslovakian wolfdog": "czechoslovakian-vlciak",
  "czechoslovakian wolfdog": "czechoslovakian-vlciak",
  "czech terrier": "cesky-terrier",
  "deerhound": "scottish-deerhound",
  "dachshund kaninchen long haired": "dachshund",
  "dachshund kaninchen smooth haired": "dachshund",
  "dachshund kaninchen wire haired": "dachshund",
  "dachshund long haired and miniature long haired": "dachshund",
  "dachshund smooth haired and miniature smooth haired": "dachshund",
  "dachshund wire haired and miniature wire haired": "dachshund",
  "deutscher wachtelhund german spaniel": "deutscher-wachtelhund",
  "danish broholmer": "broholmer",
  "deutsch langhaar": "german-longhaired-pointer",
  "deutsch stichelhaar": "german-rough-haired-pointer",
  "drentse patrijshond": "drentsche-patrijshond",
  "drentsche partridge dog": "drentsche-patrijshond",
  "dunker": "norwegian-hound",
  "norwegian hound": "norwegian-hound",
  "dobermann": "doberman-pinscher",
  "dutch schapendoes": "schapendoes",
  "dutch shepherd dog": "dutch-shepherd",
  "english bulldog": "bulldog",
  "english pointer": "pointer",
  "eurasian": "eurasier",
  "eurasier": "eurasier",
  "entlebuch cattle dog": "entlebucher-mountain-dog",
  "entlebucher": "entlebucher-mountain-dog",
  "epagneul bleu de picardie": "blue-picardy-spaniel",
  "epagneul breton": "brittany",
  "epagneul de pont audemer": "pont-audemer-spaniel",
  "epagneul picard": "picardy-spaniel",
  "picardy spaniel": "picardy-spaniel",
  "epagneul francais french spaniel": "french-spaniel",
  "fawn brittany griffon": "griffon-fauve-de-bretagne",
  "finnish lapponian dog": "finnish-lapphund",
  "french pointing dog gascogne type": "braque-francais-de-grande-taille",
  "french pointing dog pyrenean type": "braque-francais-de-petite-taille",
  "french tricolour hound": "chien-francais-tricolore",
  "french white and black hound": "chien-francais-blanc-et-noir",
  "french white and orange hound": "francais-blanc-et-orange",
  "french water dog": "barbet",
  "fresian water dog": "wetterhoun",
  "fox terrier smooth": "smooth-fox-terrier",
  "fox terrier wire": "wire-fox-terrier",
  "foxhound": "english-foxhound",
  "german hunting terrier": "jagdterrier",
  "german hound": "deutsche-bracke",
  "german spaniel": "deutscher-wachtelhund",
  "german shepherd dog": "german-shepherd",
  "german shepherd dog long stock coat": "german-shepherd",
  "german short haired pointing dog": "german-shorthaired-pointer",
  "german wire haired pointing dog": "german-wirehaired-pointer",
  "german spitz klein mittel": "german-spitz",
  "great swiss mountain dog": "greater-swiss-mountain-dog",
  "great gascony blue": "grand-bleu-de-gascogne",
  "gascon saintongeois": "grand-gascon-saintongeois",
  "halden hound": "halden-hound",
  "haldenstover halden hound": "halden-hound",
  "great anglo french tricolour hound": "great-anglo-francais-tricolor-hound",
  "great anglo french white and black hound": "great-anglo-francais-white-and-black-hound",
  "great anglo french white and orange hound": "great-anglo-francais-white-and-orange-hound",
  "griffon wire haired pointing": "wirehaired-pointing-griffon",
  "griffon belge": "brussels-griffon",
  "griffon bruxellois": "brussels-griffon",
  "griffon bruxellois smooth": "brussels-griffon",
  "griffon bruxellois wire": "brussels-griffon",
  "hanoverian hound": "hanoverian-scenthound",
  "hungarian greyhound magyar agar": "hungarian-greyhound",
  "hungarian greyhound": "hungarian-greyhound",
  "hungarian hound transylvanian scent hound": "transylvanian-hound",
  "hungarian short haired pointer vizsla": "vizsla",
  "hungarian vizsla": "vizsla",
  "hungarian wire haired pointer": "wirehaired-vizsla",
  "hungarian wirehaired vizsla": "wirehaired-vizsla",
  "hungarian wire haired vizsla": "wirehaired-vizsla",
  "iceland sheepdog": "icelandic-sheepdog",
  "ibizan podenco": "ibizan-hound",
  "irish glen of imaal terrier": "glen-of-imaal-terrier",
  "irish red setter": "irish-setter",
  "irish soft coated wheaten terrier": "soft-coated-wheaten-terrier",
  "italian cane corso": "cane-corso",
  "italian greyhound": "italian-greyhound",
  "italian pointing dog": "bracco-italiano",
  "italian sighthound": "italian-greyhound",
  "italian spinone": "spinone-italiano",
  "italian hound": "segugio-italiano",
  "italian volpino": "volpino-italiano",
  "istrian coarse haired hound": "istrian-wire-haired-hound",
  "istrian wire haired hound": "istrian-wire-haired-hound",
  "japanese akita": "akita",
  "japanese akitainu": "akita",
  "kai": "kai-ken",
  "kangal dog": "kangal-shepherd-dog",
  "kishu": "kishu-ken",
  "king charles spaniel": "english-toy-spaniel",
  "kleiner munsterlander": "small-munsterlander",
  "korea jindo dog": "korean-jindo-dog",
  "jindo": "korean-jindo-dog",
  "kooikerhondje": "nederlandse-kooikerhondje",
  "little lion dog": "lowchen",
  "long haired pyrenean sheepdog": "pyrenean-shepherd",
  "lapinporokoira lapponian herder": "lapponian-herder",
  "lowchen little lion dog": "lowchen",
  "louisiana catahoula leopard dog": "catahoula-leopard-dog",
  "lundehund": "norwegian-lundehund",
  "maremma sheepdog": "maremma-sheepdog",
  "majorca shepherd dog": "ca-de-bestiar",
  "ca de bestiar majorca shepherd dog": "ca-de-bestiar",
  "manchester terrier standard": "manchester-terrier",
  "manchester terrier toy": "manchester-terrier",
  "minature bull terrier": "miniature-bull-terrier",
  "miniature long haired dachshund": "dachshund",
  "miniature smooth haired dachshund": "dachshund",
  "miniature wire haired dachshund": "dachshund",
  "norrbottenspitz": "norrbottenspets",
  "norrbottenspetz": "norrbottenspets",
  "norman artesien basset": "basset-artesien-normand",
  "basset artesien normand": "basset-artesien-normand",
  "bavarian mountain hound": "bavarian-mountain-scent-hound",
  "bavarian mountain scent hound": "bavarian-mountain-scent-hound",
  "norwegian elkhound grey": "norwegian-elkhound",
  "perro de presa canario": "presa-canario",
  "peruvian hairless dog": "peruvian-inca-orchid",
  "peruvian hairless dog small medium large": "peruvian-inca-orchid",
  "petit brabancon": "brussels-griffon",
  "podenco canario": "canarian-warren-hound",
  "podengo portugues": "portuguese-podengo",
  "podengo portugues o": "portuguese-podengo",
  "podengo portugueso": "portuguese-podengo",
  "chart polski polish greyhound": "chart-polski",
  "polski owczarek nizinny polish owczarek nizinny": "polish-lowland-sheepdog",
  "poodle miniature": "miniature-poodle",
  "poodle standard": "standard-poodle",
  "poodle toy": "toy-poodle",
  "polish greyhound": "chart-polski",
  "polish tatra shepherd": "polish-tatra-sheepdog",
  "owczarek podhalanski": "polish-tatra-sheepdog",
  "portuguese warren hound portuguese podengo": "portuguese-podengo",
  "portuguese pointing dog": "portuguese-pointer",
  "portuguese podengo large": "portuguese-podengo",
  "portuguese podengo medium": "portuguese-podengo",
  "portuguese podengo small": "portuguese-podengo",
  "posavaz hound": "posavatz-hound",
  "posavatz hound": "posavatz-hound",
  "pyrenean mountain dog": "great-pyrenees",
  "pyrenean sheepdog longhaired": "pyrenean-shepherd",
  "retriever chesapeake bay": "chesapeake-bay-retriever",
  "retriever curly coated": "curly-coated-retriever",
  "retriever flat coated": "flat-coated-retriever",
  "retriever golden": "golden-retriever",
  "retriever labrador": "labrador-retriever",
  "retriever nova scotia duck tolling": "nova-scotia-duck-tolling-retriever",
  "romagna water dog": "lagotto-romagnolo",
  "rough collie": "collie",
  "jack russell terrier": "russell-terrier",
  "russell terrier": "russell-terrier",
  "russian black terrier": "black-russian-terrier",
  "rafeiro of alentejo": "rafeiro-do-alentejo",
  "romanian carpathian shepherd dog": "romanian-carpathian-shepherd",
  "russian toy long haired": "russian-toy",
  "russian toy smooth haired": "russian-toy",
  "russkiy toy": "russian-toy",
  "saarloosewolfdog": "saarloos-wolfdog",
  "saarloos wolfhond": "saarloos-wolfdog",
  "saint germain pointer": "braque-saint-germain",
  "sarplaninac": "sarplaninac",
  "schnauzer giant": "giant-schnauzer",
  "schnauzer miniature": "miniature-schnauzer",
  "schnauzer standard": "standard-schnauzer",
  "schnauzer": "standard-schnauzer",
  "setter english": "english-setter",
  "setter gordon": "gordon-setter",
  "setter irish": "irish-setter",
  "setter irish red and white": "irish-red-and-white-setter",
  "serbian tricolour hound": "serbian-tricolor-hound",
  "schiller hound": "schillerstovare",
  "schillerstovare": "schillerstovare",
  "shar pei": "chinese-shar-pei",
  "shiba": "shiba-inu",
  "shikoku ken": "shikoku",
  "shikoku": "shikoku",
  "silky terrier": "silky-terrier",
  "slovac cuvac": "slovensky-cuvac",
  "slovakian chuvach": "slovensky-cuvac",
  "slovakian hound": "slovensky-kopov",
  "smooth collie": "collie",
  "smooth vizsla": "vizsla",
  "south african boerboel": "boerboel",
  "spaniel american cocker": "cocker-spaniel",
  "spaniel american water": "american-water-spaniel",
  "spaniel blue picardy": "blue-picardy-spaniel",
  "spaniel brittany": "brittany",
  "spaniel clumber": "clumber-spaniel",
  "spaniel english cocker": "english-cocker-spaniel",
  "spaniel english springer": "english-springer-spaniel",
  "spaniel field": "field-spaniel",
  "spaniel french": "french-spaniel",
  "spaniel irish water": "irish-water-spaniel",
  "spaniel sussex": "sussex-spaniel",
  "spaniel welsh springer": "welsh-springer-spaniel",
  "stabijhoun": "stabyhoun",
  "small blue gascony": "petit-bleu-de-gascogne",
  "smaland hound": "smalandsstovare",
  "smalandsstovare": "smalandsstovare",
  "standard american eskimo dog": "american-eskimo-dog",
  "standard long haired dachshund": "dachshund",
  "standard smooth dachshund": "dachshund",
  "standard wire haired dachshund": "dachshund",
  "swedish elkhound": "jamhund",
  "tatra shepherd dog": "polish-tatra-sheepdog",
  "thai ridgeback dog": "thai-ridgeback",
  "thai bangkaew": "thai-bangkaew-dog",
  "thai bangkaew dog": "thai-bangkaew-dog",
  "tosa ken": "tosa",
  "toy american eskimo dog": "american-eskimo-dog",
  "toy manchester terrier": "manchester-terrier",
  "miniature american eskimo dog": "american-eskimo-dog",
  "miniature xoloitzcuintli": "xoloitzcuintli",
  "standard xoloitzcuintli": "xoloitzcuintli",
  "toy xoloitzcuintli": "xoloitzcuintli",
  "gascogne braque francais": "braque-francais-de-grande-taille",
  "pyrenees braque francais": "braque-francais-de-petite-taille",
  "weimaraner long hair": "weimaraner",
  "welsh corgi cardigan": "cardigan-welsh-corgi",
  "welsh corgi pembroke": "pembroke-welsh-corgi",
  "white shepherd": "white-swiss-shepherd-dog",
  "wire haired pointing griffon": "wirehaired-pointing-griffon",
  "wire haired pointing griffon korthals": "wirehaired-pointing-griffon",
  "wire haired vizsla": "wirehaired-vizsla",
  "hanoverian scent hound": "hanoverian-scenthound",
  "picardy sheepdog": "berger-picard",
  "slovakian wire haired pointing dog": "slovakian-wirehaired-pointer",
  "wirehaired slovakian pointer": "slovakian-wirehaired-pointer",
  "xoloitzcuintle": "xoloitzcuintli",
  "xoloitzcuintle miniature intermediate standard": "xoloitzcuintli",
  "yugoslavian shepherd dog sharplanina": "sarplaninac"
}));

const preferredNames = new Map(Object.entries({
  "alpine-dachsbracke": "Alpine Dachsbracke",
  "australian-stumpy-tail-cattle-dog": "Australian Stumpy Tail Cattle Dog",
  "bavarian-mountain-scent-hound": "Bavarian Mountain Scent Hound",
  "blue-picardy-spaniel": "Blue Picardy Spaniel",
  "canarian-warren-hound": "Canarian Warren Hound",
  "catahoula-leopard-dog": "Catahoula Leopard Dog",
  "chart-polski": "Chart Polski",
  "drentsche-patrijshond": "Drentsche Patrijshond",
  "hanoverian-scenthound": "Hanoverian Scenthound",
  "halden-hound": "Halden Hound",
  "hungarian-greyhound": "Hungarian Greyhound",
  "istrian-wire-haired-hound": "Istrian Wire-Haired Hound",
  "jamhund": "Jämthund",
  "japanese-akitainu": "Japanese Akitainu",
  "kai-ken": "Kai Ken",
  "kangal-shepherd-dog": "Kangal Shepherd Dog",
  "korean-jindo-dog": "Korean Jindo Dog",
  "maremma-sheepdog": "Maremma Sheepdog",
  "norrbottenspets": "Norrbottenspets",
  "peruvian-inca-orchid": "Peruvian Inca Orchid",
  "polish-tatra-sheepdog": "Polish Tatra Sheepdog",
  "portuguese-podengo": "Portuguese Podengo",
  "posavatz-hound": "Posavatz Hound",
  "presa-canario": "Presa Canario",
  "saarloos-wolfdog": "Saarloos Wolfdog",
  "sarplaninac": "Šarplaninac",
  "schillerstovare": "Schillerstövare",
  "shikoku": "Shikoku",
  "slovakian-wirehaired-pointer": "Slovakian Wirehaired Pointer",
  "slovensky-cuvac": "Slovenský Cuvac",
  "slovensky-kopov": "Slovenský Kopov",
  "smalandsstovare": "Smålandsstövare",
  "thai-bangkaew-dog": "Thai Bangkaew Dog",
  "thai-ridgeback": "Thai Ridgeback",
  "tosa": "Tosa",
  "white-swiss-shepherd-dog": "White Swiss Shepherd Dog",
  "wirehaired-vizsla": "Wirehaired Vizsla"
}));

const breeds = currentDocument.breeds.map((breed) => structuredClone(breed));
for (const breed of breeds) {
  if (!breed.facts) continue;
  delete breed.facts.registryRecognition;
  delete breed.facts.reviewStatus;
  if (Object.keys(breed.facts).length === 0) delete breed.facts;
}
const bySlug = new Map(breeds.map((breed) => [breed.slug, breed]));

function registerName(record) {
  const names = [record.name, ...(record.aliases ?? [])];
  return names.map(normalize);
}

function findExisting(name) {
  const key = normalize(name);
  const overriddenSlug = overrides.get(key);
  if (overriddenSlug && bySlug.has(overriddenSlug)) return bySlug.get(overriddenSlug);
  for (const breed of breeds) {
    if (registerName(breed).includes(key)) return breed;
  }
  let best = null;
  for (const breed of breeds) {
    const score = Math.max(...registerName(breed).map((candidate) => similarity(key, candidate)));
    if (score >= 0.96 && (!best || score > best.score)) best = { breed, score };
  }
  return best?.breed ?? null;
}

function ensureBreed(entry) {
  const key = normalize(entry.name);
  const requestedSlug = overrides.get(key);
  let breed = requestedSlug ? bySlug.get(requestedSlug) : findExisting(entry.name);
  if (breed) return breed;

  const name = preferredNames.get(requestedSlug) ?? titleCase(entry.name);
  let slug = requestedSlug ?? slugify(name);
  if (bySlug.has(slug)) {
    let suffix = 2;
    while (bySlug.has(`${slug}-${suffix}`)) suffix += 1;
    slug = `${slug}-${suffix}`;
  }
  breed = { id: `dog:${slug}`, name, slug };
  breeds.push(breed);
  bySlug.set(slug, breed);
  return breed;
}

const registryOrder = ["akc", "ukc", "fci", "ckc", "dogsAustralia", "abkc"];

for (const registry of registryOrder) {
  for (const entry of snapshot.registries[registry].breeds) {
    const breed = ensureBreed(entry);
    breed.facts ??= {};
    breed.facts.registryRecognition ??= [];
    if (!breed.facts.registryRecognition.some((item) => item.registry === registry && item.registryId === entry.registryId)) {
      breed.facts.registryRecognition.push({
        registry,
        registryId: entry.registryId,
        name: entry.name,
        status: entry.status,
        auditedAt: snapshot.auditedAt
      });
    }
    if (normalize(entry.name) !== normalize(breed.name)) {
      breed.aliases ??= [];
      if (!breed.aliases.some((alias) => normalize(alias) === normalize(entry.name))) breed.aliases.push(entry.name);
    }
  }
}

for (const breed of breeds) {
  if (!breed.facts?.registryRecognition?.length) {
    breed.facts ??= {};
    breed.facts.reviewStatus = "not-confirmed-by-audited-registries";
  }
  if (breed.aliases) breed.aliases.sort((left, right) => left.localeCompare(right, "en"));
  if (breed.facts?.registryRecognition) {
    breed.facts.registryRecognition.sort((left, right) => left.registry.localeCompare(right.registry, "en"));
  }
}

breeds.sort((left, right) => left.name.localeCompare(right.name, "en"));
const proposed = {
  ...currentDocument,
  sources: [
    {
      name: "Federation Cynologique Internationale breed nomenclature",
      url: "https://www.fci.be/en/Nomenclature/Default.aspx",
      retrievedAt: snapshot.auditedAt
    },
    {
      name: "American Kennel Club dog breeds",
      url: "https://www.akc.org/dog-breeds/",
      retrievedAt: snapshot.auditedAt
    },
    {
      name: "United Kennel Club breed standards",
      url: "https://www.ukcdogs.com/breed-standards",
      retrievedAt: snapshot.auditedAt
    },
    {
      name: "Canadian Kennel Club all dogs",
      url: "https://www.ckc.ca/en/Choosing-a-Dog/Choosing-a-Breed/All-Dogs",
      retrievedAt: snapshot.auditedAt
    },
    {
      name: "American Bully Kennel Club breeds",
      url: "https://abkcdogs.net/breed2/",
      retrievedAt: snapshot.auditedAt
    },
    {
      name: "Dogs Australia browse a breed",
      url: "https://www.dogsaustralia.org.au/BrowseBreed/browse-a-breed/",
      retrievedAt: snapshot.auditedAt
    }
  ],
  breeds
};
const outputPath = path.join(root, "research", "proposed-dog-breeds.json");
await writeFile(outputPath, `${JSON.stringify(proposed, null, 2)}\n`);

if (process.argv.includes("--write")) {
  await writeFile(path.join(root, "species", "dog", "breeds.json"), `${JSON.stringify(proposed, null, 2)}\n`);
}

console.log(`${process.argv.includes("--write") ? "Updated" : "Proposed"} catalog: ${breeds.length} breeds (${breeds.length - currentDocument.breeds.length} additions).`);
