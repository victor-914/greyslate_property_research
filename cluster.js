import csv from "csv-parser";
import puppeteer from "puppeteer";
import fs from "fs";
import { stringify } from "csv-stringify";

const columns = [
  "OWNER",
  "ADDRESS2",
  "ADDRESS3",
  "ADDRESS4",
  "CITY",
  "STATE",
  "ZIP",
  "apn",
  "propertyType",
  "status",
  "ownertype",
  "mailAddress",
  "ownerName",
];

const data = [];

// READ CSV
fs.createReadStream(
  "/root/output.csv"
)
  .pipe(csv())
  .on("data", (row) => {
    data.push(row);
  })
  .on("end", () => {
    console.log("CSV file successfully processed.");
    fs.writeFileSync("jsoncsv.json", JSON.stringify(data, null, 2));
  })
  .on("error", (error) => {
    console.error("Error reading CSV file:", error);
  });

function writeLogEntry(entry, success, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    success,
    address: entry.ADDRESS2 || "N/A",
    ...(error && { error: error.toString() }),
    ...(success && { data: entry }),
  };

  fs.appendFileSync(
    "scrape_log.json",
    JSON.stringify(logEntry, null, 2) + ",\n"
  );
}

export async function scrapePropwire() {
  try {
    let onc;
    let result = [];
    let login = "no";

    const browser = await puppeteer.launch({ headless: true,
 args: ['--no-sandbox', '--disable-setuid-sandbox']
 });
    let page = null;

    for (const addr of data) {
      try {
        page = await browser.newPage();
        await page.setViewport({
          width: 1500,
          height: 1000,
        });
        await page.goto(`https://login.propstream.com/`);

        await page.setJavaScriptEnabled(true);

        // Check if email input is already filled
        const emailInput = await page.waitForSelector(
          "#form-content > form > input[type=text]:nth-child(1)"
        );
        const emailValue = await page.evaluate((el) => el.value, emailInput);
        console.log("🚀 ~ scrapePropwire ~ emailValue:", emailValue);

        // Only type email if the field is empty
        if (!emailValue) {
          await emailInput.type("management.greyslate@gmail.com");
          // password
          await page.waitForSelector(
            "#form-content > form > input[type=password]:nth-child(2)"
          );
          await page.type(
            "#form-content > form > input[type=password]:nth-child(2)",
            "BrickHouses2025$"
          );
        }

        await page.click("#form-content > form > button");

        await page.waitForNavigation();

        await page.evaluate(() => {
          navigator.geolocation.getCurrentPosition = (success, error) => {
            success({
              coords: { latitude: 37.7749, longitude: -122.4194 },
            });
          };
        });

        // CLEAR ALERT
        console.log("..................clear alert");
        await page.waitForSelector(
          "#alert > div > div > div > div > div > div > div.src-app-components-Alert-style__v_VRN__buttonContainer > button",
          300000
        );
        await page.click(
          "#alert > div > div > div > div > div > div > div.src-app-components-Alert-style__v_VRN__buttonContainer > button"
        );

        console.log("...........clear dialog");
        page.on("dialog", async (dialog) => {
          await dialog.accept();
        });

        console.log("..........clearing inputs");
        const inputFieldk = await page.waitForSelector(
          ".src-app-Search-Header-style__Mbe91__searchInput .src-app-Search-Header-style__Yf_Zr__search input"
        );
        await inputFieldk.click({ clickCount: 3 });
        await inputFieldk.type(String.fromCharCode(8));

        console.log(
          `${new Date().toLocaleTimeString()},...................................TYPE IN SEARCH BAR`
        );
        const input2 = await page.waitForSelector(
          ".src-app-Search-Header-style__Mbe91__searchInput .src-app-Search-Header-style__Yf_Zr__search input"
        );

        console.log(`typing this adddress.........${addr.ADDRESS2}`);
        await input2.type(`${addr.ADDRESS2} ${addr.ADDRESS3} ${addr.CITY}`);
        await input2.focus();
        await input2.press("Enter");
        await page.keyboard.press("Enter");
        console.log("................TYPING IN SEARCH BAR DONE...finished.");
        await input2.press("Enter");

        const kc = await page.waitForSelector(
          ".react-autosuggest__suggestion--first"
        );
        await kc.click();

        const text = await kc.evaluate((el) => el.textContent.trim());
        console.log("Extracted text:", text);

        console.log("open property .................................");
        await new Promise((resolve) => setTimeout(resolve, 7000));
        await page.waitForSelector(
          "#root > div > div.src-components-Loader-style__tbIRk__withHoverLoader > div > div > div.src-app-style__x5gBM__wrapper > div:nth-child(2) > div > section > div.src-app-Search-style__md2Oo__rightSide > div > div > div > div > div.src-app-Search-Property-style__JmCel__subject > div.src-app-Search-Property-style__Du0S0__buttons > a"
        );

        await page.click(
          "#root > div > div.src-components-Loader-style__tbIRk__withHoverLoader > div > div > div.src-app-style__x5gBM__wrapper > div:nth-child(2) > div > section > div.src-app-Search-style__md2Oo__rightSide > div > div > div > div > div.src-app-Search-Property-style__JmCel__subject > div.src-app-Search-Property-style__Du0S0__buttons > a"
        );

        console.log("..............OPEN PROPERTY DETAILS LINK");
        await new Promise((resolve) => setTimeout(resolve, 7000));

        const getPropertyDetails = async (page) => {
          const propertyDetails = {};

          const extractText = async (selector) => {
            await page
              .waitForSelector(selector, { timeout: 3000 })
              .catch(() => null);
            const element = await page.$(selector);
            if (element) {
              return await page.evaluate(
                (el) => el.textContent.trim(),
                element
              );
            }
            return null;
          };

          propertyDetails.propertyType = await extractText(
            "#propertyDetail > div > div > div.src-components-Loader-style__tbIRk__withHoverLoader > div > div > div > div.src-app-Property-Detail-style__n9Zix__rowPanels > div:nth-child(1) > div > div > div > div > div.src-app-Property-Detail-style__atwsj__right.src-app-Property-Detail-style__AIzzb__items.src-app-Property-Detail-style__hZ_wv__font600 > div:nth-child(1) > div.src-app-Property-Detail-style__ozT4e__value"
          );

          propertyDetails.status = await extractText(
            "#propertyDetail > div > div > div.src-components-Loader-style__tbIRk__withHoverLoader > div > div > div > div.src-app-Property-Detail-style__n9Zix__rowPanels > div:nth-child(1) > div > div > div > div > div.src-app-Property-Detail-style__atwsj__right.src-app-Property-Detail-style__AIzzb__items.src-app-Property-Detail-style__hZ_wv__font600 > div:nth-child(2) > div.src-app-Property-Detail-style__ozT4e__value"
          );

          propertyDetails.ownertype = await extractText(
            "#propertyDetail > div > div > div.src-components-Loader-style__tbIRk__withHoverLoader > div > div > div > div.src-app-Property-Detail-style__n9Zix__rowPanels > div:nth-child(1) > div > div > div > div > div.src-app-Property-Detail-style__atwsj__right.src-app-Property-Detail-style__AIzzb__items.src-app-Property-Detail-style__hZ_wv__font600 > div:nth-child(6) > div.src-app-Property-Detail-style__ozT4e__value"
          );

          propertyDetails.ownerName = await extractText(
            "#panel\\:r1\\:0 > div:nth-child(1) > div > div > div > div > div.src-app-Property-Detail-style__JNLud__row > div:nth-child(1) > div > div.src-components-GroupInfo-style__sbtoP__value > div"
          );

          return propertyDetails;
        };

        const propertyDetails = await getPropertyDetails(page);
        await new Promise((resolve) => setTimeout(resolve, 7000));
        await page.waitForSelector(
          ".src-app-Property-Detail-style__tparO__propertyDetail .src-app-Property-Detail-style__EXbI3__tabs .src-app-Property-Detail-style__A3m2C__panel"
        );
        const parentElement = await page.$(
          ".src-app-Property-Detail-style__tparO__propertyDetail .src-app-Property-Detail-style__EXbI3__tabs .src-app-Property-Detail-style__A3m2C__panel"
        );

        console.log("running text content");

        const childrenText = await page.evaluate(async (element) => {
          return Array.from(element.children).map((child) => {
            const text = child.textContent;

            const ownerNameMatch = text.match(
              /Owner\s*1\s*Name\s*([A-Z\s]+?)(?=\s*(?:Mailing|Relationship|$))/i
            );
            const ownerName = ownerNameMatch ? ownerNameMatch[1].trim() : null;
            console.log("🚀 ~ returnArray.from ~ text:", text);

            const mailingAddressMatch = text.match(
              /Mailing\s*Address\s*([\w\s\W]+?)\n/i
            );
            const mailingAddress = mailingAddressMatch
              ? mailingAddressMatch[1].trim()
              : null;

            return {
              ownerName,
              mailingAddress,
            };
          });
        }, parentElement);
        console.log("🚀 ~ childrenText ~ childrenText:", childrenText);

        page.waitForSelector(
          "#propertyDetail > div > div > div.src-components-base-Modal-style__gBl1l__modalHeader > button"
        );
        await page.click(
          "#propertyDetail > div > div > div.src-components-base-Modal-style__gBl1l__modalHeader > button"
        );

        await new Promise((resolve) => setTimeout(resolve, 70));

        console.log("...........CLOSEd PROPERTY MODAL");

        const inputField = await page.waitForSelector(
          ".src-app-Search-Header-style__Mbe91__searchInput .src-app-Search-Header-style__Yf_Zr__search input"
        );
        await inputField.click({ clickCount: 3 });
        await inputField.type(String.fromCharCode(8));
        console.log(
          "clearing inputs.............................................."
        );

        if (propertyDetails) {
          Object.assign(addr, {
            propertyType: propertyDetails.propertyType,
            status: propertyDetails.status,
            ownertype: propertyDetails.ownertype,
            mailingAddress: childrenText[0].mailingAddress,
            ownerName: childrenText[0].ownerName,
          });
          console.log({
            propertyType: propertyDetails.propertyType,
            status: propertyDetails.status,
            ownertype: propertyDetails.ownertype,
            mailingAddress: childrenText[0].mailingAddress,
            ownerName: childrenText[0].ownerName,
          });

          result.push(addr);

          // stringify(
          //   addr,
          //   { header: false, columns: columns },
          //   (err, output) => {
          //     if (err) throw err;

          //     fs.writeFile("outputprop.csv", output, (err) => {
          //       if (err) throw err;
          //       console.log("CSV file has been saved as outputprop.csv");
          //     });
          //   }
          // );

          // Create a new array with data in the same order as columns
          const rowData = columns.map((col) => {
            // Handle cases where the property might be undefined
            return addr[col] !== undefined ? addr[col] : "";
          });

          // Convert to CSV row
          const csvRow = rowData
            .map((field) => {
              // Escape fields that contain commas or quotes
              if (
                typeof field === "string" &&
                (field.includes(",") || field.includes('"'))
              ) {
                return `"${field.replace(/"/g, '""')}"`;
              }
              return field;
            })
            .join(",");

          // Append to CSV file
          fs.appendFileSync("outputprop.csv", csvRow + "\n");
          console.log("CSV row has been appended to outputprop.csv");

          // Write successful log entry
          writeLogEntry(addr, true);

          console.log("logging out");
          await page.evaluate(() => {
            localStorage.clear();
          });

          await page.evaluate(() => {
            sessionStorage.clear();
          });
          await browser.deleteCookie(...(await browser.cookies()));
          page.close();
        }
      } catch (error) {
        console.log("🚀 ~ error:", error);
        // Write failed log entry
        writeLogEntry(addr, false, error);

        console.log("cleaning resources...............in error");
        await page.evaluate(() => {
          localStorage.clear();
        });

        await page.evaluate(() => {
          sessionStorage.clear();
        });
        await browser.deleteCookie(...(await browser.cookies()));
        page.close();
      }
    }

    console.log(result, "res");
  } catch (error) {
    console.log("🚀 ~ scrapePropwire ~ error:", error);
  }
}

// Initialize log file
// if (!fs.existsSync('scrape_log.json')) {
//   fs.writeFileSync('scrape_log.json', '[\n');
// } else {
//   fs.appendFileSync('scrape_log.json', '[\n');
// }

// Initialize log file
fs.writeFileSync("scrape_log.json", "[\n");
scrapePropwire().finally(() => {
  // Close the log file array
  fs.appendFileSync("scrape_log.json", "]");
});

