import puppeteer from "puppeteer";
import fs from "fs";

const LETTER = "c";

(async () => {
  const result = [];

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  const updateWordsTable = async (letter, pageNumber) => {
    const currentPageNumber = pageNumber || 1;
    const currentLetter = letter || LETTER;
    const pageURL = `https://esylaby.pl/podzial-na-sylaby-wyrazow-na-litere-${currentLetter}/strona${currentPageNumber}`;

    if (typeof currentLetter === "number") {
      throw new Error("Letter must be a string");
    }

    if (currentPageNumber > 6) {
      console.log("finished");
      fs.writeFile(
        `SYLABA_${LETTER.toUpperCase()}.txt`,
        result.join("\n"),
        (err) => {
          if (err) {
            console.error("Wystąpił błąd podczas zapisywania pliku:", err);
          } else {
            console.log("Plik został zapisany pomyślnie.");
          }
        }
      );

      await browser.close();
      return;
    }

    await page.goto(pageURL);

    const tableData = await page.evaluate(() => {
      const table = document.querySelector(".col-md-8 .row");
      const words = [...table.children].map((node) => node.innerText);

      return words;
    });

    if (tableData.length === 0) {
      console.log("No table data found");
      await browser.close();
      return;
    } else {
      result.push(...tableData);
      await updateWordsTable(currentLetter, currentPageNumber + 1);
    }
  };

  await updateWordsTable();
})();
