import fs from "fs";
import { HousingOffer } from "./HousingOffer";

export function createMdfile(offers: HousingOffer[]) {
  let markdownContent = `# [Action Logement Offers](https://logement-actionlogement.fr)\n`;
  markdownContent += createMapWaypointLink(offers);
  markdownContent += generateOffersTable(offers);
  // Write the Markdown content to a file
  fs.writeFileSync("housing_offers.md", markdownContent, "utf-8");
  console.log('Markdown file "housing_offers.md" has been created.');
}

function generateOffersTable(offers: HousingOffer[]): string {
  // Create the Markdown table header
  let header = `| Adresse | Size | Commute Time | Price | Escalator | Floor |\n`;
  header += `|---------|------|---------|-------|----------|----------|\n`;
  let rows = offers
    .map((offer) => {
      const addressLink = `[${offer.address}](https://www.google.com/maps?q=${encodeURIComponent(offer.address)})`;
      return (
        `| ${addressLink} | ${offer.size} m² | ${offer.commuteTime}m | ${offer.price}€ |` + 
        `${offer.haveEscalator} | ${offer.floor} |\n`
      );
    })
    .join("");
  return header + rows;
}

function createMapWaypointLink(offers: HousingOffer[], workplaceAddress = "EPEX SPOT Paris"): string {
  const origin = encodeURIComponent(workplaceAddress);
  const addresses = Array.from(new Set(offers.map((offer) => offer.address)));
  const destination = encodeURIComponent(addresses[0]);
  // All except the first as waypoints
  const waypoints = addresses
    .slice(1)
    .map((address) => encodeURIComponent(address))
    .join("|");
  console.log(waypoints);
  const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}` +
    `&travelmode=walking&waypoints=${waypoints}`;

  const googleMapsMarkdownLink = `\n## Google Maps Routes: [${addresses.length} places](<${googleMapsLink}>)\n\n`;
  console.log(googleMapsMarkdownLink);
  return googleMapsMarkdownLink;
}
// waypoints=%20RUE%20D%20ALESIA%20%2C%20%20Paris%2014e%20Arrondissement%20(75014