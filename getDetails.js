import puppeteer from "puppeteer";
import fs from "fs";
import csv from "csv-writer";

const result = [];
const createCsvWriter = csv.createObjectCsvWriter;

const LETTER = "c";
const START_LINE = 0;
const SCOPE = 50;

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const requestType = request.resourceType();

      // Block unnecessary requests
      if (
        requestType === "image" ||
        requestType === "stylesheet" ||
        requestType === "font" ||
        requestType === "script"
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });
    // Read the contents of the text file
    const fileContent = await fs.promises.readFile(
      `SYLABA_${LETTER.toUpperCase()}.txt`,
      "utf-8"
    );
    const lines = fileContent.split("\n");

    for (const line of lines) {
      const currentLine = lines.indexOf(line);

      if (currentLine < START_LINE) {
        console.log(`skipping...` + currentLine);
        continue;
      }

      if (currentLine < START_LINE + SCOPE) {
        const [word, count] = line.split("(");
        const valid = count.charAt(0) != 0;
        const value = word.trim().toLowerCase();

        if (!valid) {
        } else {
          console.log(`loading...` + currentLine);

          const url = `https://esylaby.pl/podzial-na-sylaby-wyrazu-${value}`;

          await page.goto(url);

          const htmlContent = await page.content();

          // Use page.evaluate to interact with the HTML content
          const separatedValue = await page.evaluate((html) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const element = doc.querySelector("h3");
            const text = element?.textContent;
            return text;
          }, htmlContent);

          if (separatedValue) {
            result.push({
              word: value,
              separated: separatedValue.toLowerCase(),
              count: separatedValue.split("-").length,
            });
          }
        }
      } else {
        const csvWriter = createCsvWriter({
          path: `output_${LETTER}_${START_LINE}-${SCOPE}.csv`, // Specify the path for the CSV file
          header: [
            { id: "word", title: "Word" },
            { id: "separated", title: "Separated" },
            { id: "count", title: "Count" },
          ],
        });

        csvWriter
          .writeRecords(result)
          .then(() => console.log("The CSV file was written successfully."))
          .catch((error) => console.error("An error occurred:", error));

        await browser.close();
        return;
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
