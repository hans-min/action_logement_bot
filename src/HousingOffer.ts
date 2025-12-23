// Helper to extract and remove feature by regex, optionally process match
function extractAndRemoveFeature(
  features: string[],
  pattern: RegExp,
  processMatch?: (string: string, match: RegExpMatchArray) => void
): boolean {
  const string = features.find((f) => pattern.test(f));
  if (string) {
    const match = string.match(pattern);
    if (match && processMatch) {
      processMatch(string, match);
    }
    features.splice(features.indexOf(string), 1);
    return true;
  }
  return false;
}

export class HousingOffer {
  constructor(
    public reference: string | null,
    public address: string,
    public size: number,
    public price: number,
    public dpe: string,
    public ges: string,
    public description: string | null,
    public features: string[],
    public commuteTime: string | number | null = null,
    public haveEscalator: boolean|null = null,
    public floor: number = -1,
    public numberOfBedroom: number = 0,
    public gardienIncluded: boolean = false,
    public hotWaterIncluded: boolean = false,
    public coldWaterIncluded: boolean = false,
    public heatingIncluded: boolean = false,
    public isNewBuilding: boolean = false,
  ) {
    // Extract floor
    extractAndRemoveFeature(this.features, /etage\s+(\d+)/i, (_, match) => {
      this.floor = parseInt(match[1], 10);
    });

    // Extract ascenseur
    extractAndRemoveFeature(this.features, /ascenseur/i, (string, _) => {
      this.haveEscalator = !/sans\s+ascenseur/i.test(string);
    });

    // Extract gardien inclus
    extractAndRemoveFeature(this.features, /gardien\s+inclus/i, () => {
      this.gardienIncluded = true;
    });
    // Extract number of bedrooms
    extractAndRemoveFeature(this.features, /(\d+)\s+chambres?/i, (_, match) => {
      this.numberOfBedroom = parseInt(match[1], 10);
    });

    // Extract Eau chaude comprise
    extractAndRemoveFeature(this.features, /eau\s+chaude/i, (string, _) => {
      this.hotWaterIncluded = !/eau\s+chaude\s+non\s+comprise?/i.test(string);
    });

    // Extract Eau froide comprise
    extractAndRemoveFeature(this.features, /eau\s+froide/i, (string, _) => {
      this.coldWaterIncluded = !/eau\s+froide\s+non\s+comprise?/i.test(string);
    });

    // Extract chauffage
    extractAndRemoveFeature(this.features, /chauffage/i, (string, _) => {
      this.heatingIncluded = !/chauffage.*non\s+compris/i.test(string);
    });
    // Extract new building
    extractAndRemoveFeature(this.features, /neuf|Récent/i, () => {
      this.isNewBuilding = true;
    });
  }


  toString(): string {
    return `{
      Référence: ${this.reference}
      Adresse: ${this.address}
      Size: ${this.size}m²
      Loyer (charges comprises): ${this.price}€
      DPE: ${this.dpe}
      GES: ${this.ges}
      Features: ${this.features}
      Description: ${this.description}
    }`;
  }
} 

// function checkAndRemoveFromFeatures(features: string[], pattern: RegExp, extraMatch?: RegExp): boolean {
//   const etageFeature = features.find((f) => pattern.test(f));
//   console.log("etageFeature:", etageFeature);
//   if (etageFeature) {
//     if (extraMatch && extraMatch.test(etageFeature)) {
//       const match = etageFeature.match(extraMatch);
//       if (match) {
//         match = parseInt(match[1], 10);
//         features.splice(features.indexOf(etageFeature), 1); // remove from features
//       }
//   }
// }