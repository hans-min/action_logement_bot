import dotenv from "dotenv";
import { LocationRequest, TimeFilterRequestArrivalSearch, TimeFilterResponse, TravelTimeClient } from "traveltime-api";

dotenv.config();
const apiKey = process.env.TRAVELTIME_API_KEY || "";
const appId = process.env.TRAVELTIME_APP_ID || "";

if (!apiKey || !appId) {
  throw new Error("TRAVELTIME_API_KEY and TRAVELTIME_APP_ID must be set in the environment.");
}

const travelTimeClient = new TravelTimeClient({
  apiKey,
  applicationId: appId,
});
interface CoordinateData {
  location: LocationRequest;
  commuteTime: number;
}

export async function govGeocoding(address: string): Promise<[number, number]> {
  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.append("q", address);
  url.searchParams.append("limit", "1");
  // Ensure the query is properly encoded (spaces, special chars)
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch address ${address}: ${response.statusText}`);
  }
  const coord = await response.json().then((data) => {
    if (data.features.length === 0) {
      throw new Error(`No coordinates found for address: ${address}`);
    }
    return data.features[0].geometry.coordinates;
  });
  return coord;
}

export async function geocoding(addresses: string[]) {
  let locationData: LocationRequest[] = [];
  let uniqueAddresses = Array.from(new Set(addresses));
  for (const address of uniqueAddresses) {
    await govGeocoding(address)
      .then((coord) => {
        locationData.push({ id: address, coords: { lat: coord[1], lng: coord[0] } });
      })
      .catch((e) => console.error(`Error processing ${address}:`, e));
  }
  const coordData = await get_travel_time_to_work(locationData);
  return coordData.map((data) => ({ address: data.location.id, commuteTime: data.commuteTime }));
}

async function get_travel_time_to_work(departureLocations: LocationRequest[]): Promise<CoordinateData[]> {
  const workplace: LocationRequest = {
    id: "EPEX SPOT",
    coords: { lat: 48.8714463, lng: 2.3423495 },
  };
  const arrival_many_to_one = createManyToOneSearch(departureLocations, workplace);
  let coordData: CoordinateData[] = departureLocations.map((location) => ({
    location,
    commuteTime: 0, // Default value for commute time
  }));
  try {
    const allLocations = [...departureLocations, workplace];
    const travelTimeResponse = await travelTimeClient.timeFilter({
      locations: allLocations,
      arrival_searches: [arrival_many_to_one],
    });
    // console.dir(travelTimeResponse, { depth: null });
    coordData = addCommuteTimeToLocations(coordData, travelTimeResponse);
  } catch (e) {
    console.error(e);
  }
  return coordData;
}

function createManyToOneSearch(
  departureLocations: LocationRequest[],
  arrivalLocation: LocationRequest
): TimeFilterRequestArrivalSearch {
  const departureLocationIds: string[] = departureLocations.map((location) => location.id);
  // create the most recent weekday YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];
  return {
    id: "many-to-one",
    departure_location_ids: departureLocationIds,
    arrival_location_id: arrivalLocation.id,
    transportation: {
      type: "train",
      pt_change_delay: 120,
      walking_time: 600,
      max_changes: { enabled: true, limit: 2 },
    },
    arrival_time: `${today}T11:00:00+02:00`,
    range: {
      enabled: true,
      max_results: 1,
      width: 3600, // 1 hour in seconds
    },
    travel_time: 4200, // 1 hour and 10 minutes in seconds
    snapping: { threshold: 200 },
    properties: ["travel_time"],
  };
}

function addCommuteTimeToLocations(coordData: CoordinateData[], response: TimeFilterResponse): CoordinateData[] {
  response.results[0].locations.forEach((result) => {
    // Extract travel time and address from the result
    const {
      properties: [{ travel_time }],
      id: address,
    } = result;
    const matchingLocation = coordData.find((item) => item.location.id == address);
    if (matchingLocation) {
      matchingLocation.commuteTime = Math.ceil(travel_time / 60);
    }
  });

  return coordData;
}
