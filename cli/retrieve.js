const { promisify } = require("util");
const dir = require("node-dir");

const pathsAsync = promisify(dir.paths);

const retrieveFilesAndFolders = async (dir) => {
  const paths = await pathsAsync(dir);
  return {
    filesInfo: paths.files,
  };
};

module.exports = {
  retrieveFilesAndFolders,
};
