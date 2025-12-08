import { expect, Page, test } from "@playwright/test";
import { createMdfile } from "../src/generateMarkdown";
import { HousingOffer } from "../src/HousingOffer";
import { geocoding } from "../src/traveltime";

// Load environment variables
require("@dotenvx/dotenvx").config();

test("login to action logement", async ({ page }) => {
  test.setTimeout(120_000);
  // Navigate to the login page using baseURL from config
  await page.goto("/");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await loginToActionLogement(page);
  // Rechercher un logement
  await page.getByLabel("Menu de navigation principale").getByRole("link", { name: "Rechercher un logement" }).click();

  // 0km from Paris
  await page.locator('input[name="closeable-item-radius-values"]').click();
  await page.getByText("0 km", { exact: true }).click();
  // Only long term rentals
  await page.getByRole("textbox", { name: "Type de location" }).click();
  await page.getByRole("option", { name: "Location classique" }).getByRole("checkbox").check();

  await page.getByRole("button", { name: "Lancer la recherche" }).click();
  // Wait for results to done loading
  await page.waitForSelector("div.loader", { state: "detached" });
  const totalOfferAmountLoc = await page.locator("#total-offers-amount > p.offers-total").textContent();
  console.log("Total offers found:", totalOfferAmountLoc);

  const totalOfferAmount = parseInt(totalOfferAmountLoc?.trim().split(" ")?.[0] ?? "0");
  console.log("Total offers found:", totalOfferAmount);
  // choose fa-offer-search-result 2nd child div
  const rowsLocator = page.locator("fa-offer-search-result > div:nth-child(2) > div");
  // count all the children of rowsLocator
  await expect(rowsLocator).toHaveCount(totalOfferAmount);

  // TODO: if there are more than 20 rows, we need to paginate
  let offers: HousingOffer[] = [];
  for (const annonce of await rowsLocator.all()) {
    console.log("Checking offer no", offers.length + 1, "out of", totalOfferAmount);
    await annonce.click();
    await page.waitForSelector("div.offer-infos");
    const offer = await getDataFromOffer(page);
    offers.push(offer);
    await page.goBack();
    await page.waitForSelector("fa-offer-search-result");
  }

  const addresses = offers.map((offer) => offer.address);
  const commuteTime = await geocoding(addresses);
  offers = addCommuteTimeToOfferData(offers, commuteTime);
  console.log("Added commute times to offers.");
  logTableOffers(offers);
  createMdfile(offers);
});

async function loginToActionLogement(page: Page) {
  // Get credentials from environment variables
  const email = process.env.ACTIONLOGEMENT_EMAIL;
  const password = process.env.ACTIONLOGEMENT_PASSWORD;
  if (!email || !password) {
    throw new Error("Please set ACTIONLOGEMENT_EMAIL and ACTIONLOGEMENT_PASSWORD in your .env file");
  }
  await page.getByRole("textbox", { name: "Email address" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  // This function is now integrated into the test above.
}

async function getDataFromOffer(page: Page): Promise<HousingOffer> {
  // get all the data
  const [type_size, reference, addressText, locationText, priceText, description, featuresList, heatingDiagnostic] =
    await Promise.all([
      page.locator("div.als-lodging-information").textContent(),
      page.locator("p.reference").textContent(),
      page.locator("p.address").textContent(),
      page.locator("p.location").textContent(),
      page.locator("fa-offer-apply p.price > span.amount").textContent(), // selects any descendant p.price inside fa-offer-apply
      page
        .locator("fa-description")
        .allTextContents()
        .then((descs) => descs.join("\n").trim()),
      page.locator("ul.features-list > li > span.text").all(),
      page.locator("fa-heating-diagnostic > div.dpe-item").all(),
    ]);
  const address = `${addressText}, ${locationText}`;
  const size = parseFloat(type_size?.split("-")?.pop()?.trim() ?? "") ?? -1;
  const price = parseFloat(priceText?.split("€")?.[0].trim() ?? "") ?? -1;
  const features = (await Promise.all(
    featuresList.map(async (feature) => await feature.textContent())))
    .filter((feature) => feature != null);

  // Find DPE and GES values
  let dpe = "N/A";
  let ges = "N/A";
  for (const diagnostic of heatingDiagnostic) {
    const label = await diagnostic.locator("p.dpe-label").textContent();
    const value = (await diagnostic.locator("span").textContent()) ?? "N/A";
    if (value?.includes("Non")) {
      continue;
    }
    if (label && label.includes("DPE")) {
      dpe = value;
    } else {
      ges = value;
    }
  }
  const offer = new HousingOffer(reference, address, size, price, dpe, ges, description, features);
  return offer;
}

function addCommuteTimeToOfferData(
  houseOffers: HousingOffer[],
  commuteTimes: { address: string; commuteTime: number; }[]
) {
  return houseOffers.map((offer) => {
    const commuteTime = commuteTimes.find((t) => t.address === offer.address)?.commuteTime || ">10m walk or >70";
    offer.commuteTime = commuteTime;
    return offer;
  });
}

function logTableOffers(offers: HousingOffer[]) {
  console.log("\nAll Action Logement Rentals (Paris, long term):");
  console.table(
    offers
      // .sort((a, b) => a.commuteTime - b.commuteTime)
      .map((offer) => ({
        Adresse: `${offer.address}`,
        Size: `${offer.size}m²`,
        Loyer: `${offer.price}€`,
        CommuteTime: `${offer.commuteTime}m`,
        DPE: `${offer.dpe}`,
        GES: `${offer.ges}`,
        Ascenseur: `${offer.haveEscalator !== null ? offer.haveEscalator : "N/A"}`,
        Chambres: `${offer.numberOfBedroom}`,
        Floor: `${offer.floor}`,
        NewBuilding: `${offer.isNewBuilding}`,
        Gardien: `${offer.gardienIncluded}`,
        Heating: `${offer.heatingIncluded}`,
        HotWater: `${offer.hotWaterIncluded}`,
        ColdWater: `${offer.coldWaterIncluded}`,
        Features: `${offer.features}`,
      }))
  );
}
