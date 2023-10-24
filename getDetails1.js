import puppeteer from "puppeteer";
import fs from "fs";
import csv from "csv-writer";

const LETTER = "a";
const START_LINE = 0;
const SCOPE = 50;

const createCsvWriter = csv.createObjectCsvWriter;
const result = [];
const checkedWords = new Set(); // Użyjemy zbioru do śledzenia sprawdzonych słów

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Optymalizacja zasobów poprzez blokowanie niektórych typów żądań
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (
        ["image", "stylesheet", "font", "script"].includes(
          request.resourceType()
        )
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Czytanie pliku i przygotowanie danych
    const fileContent = await fs.promises.readFile(
      `SYLABA_${LETTER.toUpperCase()}.txt`,
      "utf-8"
    );
    const lines = fileContent.trim().split("\n");

    for (
      let currentLine = START_LINE;
      currentLine < lines.length && currentLine < START_LINE + SCOPE;
      currentLine++
    ) {
      const [word, count] = lines[currentLine].split("(");
      const valid = count.charAt(0) != "0";
      const value = word.trim().toLowerCase();

      if (valid && !checkedWords.has(value)) {
        console.log(`loading... ${currentLine}`);
        checkedWords.add(value);

        const url = `https://esylaby.pl/podzial-na-sylaby-wyrazu-${value}`;
        await page.goto(url);

        // Pobieranie zawartości strony i przetwarzanie jej w ramach jednego wywołania
        const separatedValue = await page.evaluate(() => {
          const element = document.querySelector("h3");
          return element?.textContent.toLowerCase() || null;
        });

        if (separatedValue) {
          result.push({
            word: value,
            separated: separatedValue,
            count: separatedValue.split("-").length,
          });
        }
      }
    }

    // Zapisywanie wyników po zakończeniu pętli, a nie w jej trakcie
    if (result.length > 0) {
      const csvWriter = createCsvWriter({
        path: `output_${LETTER}_${START_LINE}-${SCOPE}.csv`,
        header: [
          { id: "word", title: "Word" },
          { id: "separated", title: "Separated" },
          { id: "count", title: "Count" },
        ],
      });

      await csvWriter.writeRecords(result);
      console.log("The CSV file was written successfully.");
    }

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
