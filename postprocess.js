// This can be a typescript file as well

// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, txt, json, excel, zip, and image files
import {
  readJSON,
  writeJSON,
  removeFile,
} from "https://deno.land/x/flat@0.0.10/mod.ts";
import PromisePool from "@supercharge/promise-pool";

// Step 1: Read the downloaded_filename JSON
const filename = Deno.args[0]; // Same name as downloaded_filename `const filename = 'outages.json';`
const json = await readJSON(filename);
console.log(json);

// Step 2: Parse addresses from the Message
const { CurrentOutagePeriods, FutureOutagePeriods } = json;
const FutureOutages = [];

const decodeLocations = async (outage) => {
  const geocodeUrl = new URL("https://geocode.xyz");

  try {
    const params = {
      scantext: outage.Message,
      json: "1",
    };

    Object.keys(params).forEach((key) =>
      geocodeUrl.searchParams.append(key, params[key])
    );

    const response = await fetch(geocodeUrl, {
      headers: {
        accept: "application/json",
      },
    });

    const json = response.json();

    if (json.matches?.length) {
      console.log(json.matches);
      const matches = json.match.filter(
        (m) => m.matchtype !== "locality" || m.matchtype !== "intersection"
      );
      outage.Locations = matches;
    }
  } catch (error) {
    console.error(error);
  }
};

const { results, errors } = await PromisePool.for(CurrentOutagePeriods)
  .withConcurrency(20)
  .process(async (outage) => {
    const outageWithLocations = await decodeLocations(outage);
    return outageWithLocations;
  });

// Step 3. Write a new JSON file with our filtered data
const newFilename = `outages-postprocessed.json`; // name of a new file to be saved
await writeJSON(newFilename, results); // create a new JSON file
console.log("Wrote a post process file");

// Optionally delete the original file
// await removeFile('./outages.json') // equivalent to removeFile('outages.json')
