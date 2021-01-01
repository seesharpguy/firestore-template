const { promisify } = require("util");
const { readFile } = require("fs");
const replaceall = require("replaceall");
const { outputFile, pathExists } = require("fs-extra");
const outputFileAsync = promisify(outputFile);
const readFileAsync = promisify(readFile);

const replaceInFileContent = async ({ token, value, filePath }) => {
  if (await pathExists(filePath)) {
    const fileContent = await readFileAsync(filePath, "utf8");
    const updatedFileContent = replaceall(token, value, fileContent);

    await outputFileAsync(filePath, updatedFileContent);
  } else {
    console.log(`${filePath} not found`);
  }
};

module.exports = {
  replaceInFileContent,
};
