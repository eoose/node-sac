const { createProxyMiddleware } = require("http-proxy-middleware");
const FILE_PATH = process.env.FILE_PATH || './.npm';
const port = process.env.PORT || 3000;
const express = require("express");
const app = express();
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);
const fs = require("fs");
const path = require("path");
const axios = require('axios');
const os = require('os');

//创建运行文件夹
if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH);
  console.log(`${FILE_PATH} is created`);
} else {
  console.log(`${FILE_PATH} already exists`);
}

app.get("/", function(req, res) {
  res.send("hello world");
});
app.use(
  "/",
  createProxyMiddleware({
    target: "http://127.0.0.1:8080",
    changeOrigin: true,
    onProxyReq: function onProxyReq(req, res) { },
    pathRewrite: {
      "^/": "/",
    },
    ws: true,
    logLevel: "silent" 
  })
);

// 判断系统架构
function getSystemArchitecture() {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64') {
    return 'arm';
  } else {
    return 'amd';
  }
}

// 下载必要运行文件
function downloadFile(fileName, fileUrl) {
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream',
    })
      .then(response => {
        const filePath = path.join(FILE_PATH, fileName);
        const stream = fs.createWriteStream(filePath);
        response.data.pipe(stream);
        stream.on('finish', function () {
          stream.close();
          // 设置文件权限为775
          fs.chmod(filePath, 0o775, (err) => {
            if (err) {
              console.error(`Failed to set file permissions for ${fileName}: ${err.message}`);
              reject(`Failed to set file permissions for ${fileName}`);
            } else {
              console.log(`Set file permissions for ${fileName}`);
              resolve(fileName);
            }
          });
        });
      })
      .catch(err => {
        reject(`Download ${fileName} file failed`);
      });
  });
}

// 根据系统架构返回对应的文件url
function getFilesForArchitecture(architecture) {
  if (architecture === 'arm') {
    return [
      { fileName: "web", fileUrl: "https://github.com/eoovve/test/releases/download/ARM/web" },
      { fileName: "swith", fileUrl: "https://github.com/eoovve/test/releases/download/ARM/swith" },
      { fileName: "server", fileUrl: "https://github.com/eoovve/test/releases/download/ARM/server" },
      { fileName: "start.sh", fileUrl: "https://github.com/eoovve/test/releases/download/6-amd/start.sh" },
    ];
  } else if (architecture === 'amd') {
    return [
      { fileName: "web", fileUrl: "https://github.com/eoovve/test/raw/main/web" },
      { fileName: "swith", fileUrl: "https://github.com/eoovve/test/raw/main/swith" },
      { fileName: "server", fileUrl: "https://github.com/eoovve/test/raw/main/server" },
      { fileName: "start.sh", fileUrl: "https://github.com/eoovve/test/releases/download/6-amd/start.sh" },
    ];
  }
  return [];
}

async function downloadAndRunFiles() {
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  try {
    const downloadedFiles = await Promise.all(filesToDownload.map(fileInfo => downloadFile(fileInfo.fileName, fileInfo.fileUrl))); // 这里需要添加一个括号

    console.log("All files downloaded and permissions set");

    // 执行start.sh
    const { stdout, stderr } = await execPromise('bash start.sh', { cwd: FILE_PATH });
    console.log(stdout);
    console.error(stderr);
    console.log(`End of script execution`);
  } catch (error) {
    console.error(error);
  }
}

downloadAndRunFiles();


app.listen(port, () => console.log(`Server is running on port ${port}!`));
