import fs from "node:fs";
import path from "node:path";

const clientDir = path.resolve("dist/client");
const assetsDir = path.join(clientDir, "assets");
const indexPath = path.join(clientDir, "index.html");

if (!fs.existsSync(indexPath)) {
  console.log("No index.html found in dist/client, creating one...");
}

const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
const jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
const cssFile = files.find(
  (f) => f.startsWith("styles-") && f.endsWith(".css"),
);

console.log("Found client bundle assets:", { jsFile, cssFile });

const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#6366f1" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="JobTrack" />
    <title>JobTrack — Job Application Tracker</title>
    <link rel="icon" type="image/png" href="/jobtracker.png" />
    <link rel="apple-touch-icon" href="/jobtracker.png" />
    <link rel="manifest" href="/manifest.json" />
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ""}
  </head>
  <body>
    <div id="app"></div>
    ${jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : ""}
  </body>
</html>
`;

fs.writeFileSync(indexPath, htmlContent, "utf-8");
console.log("Successfully generated production dist/client/index.html!");
