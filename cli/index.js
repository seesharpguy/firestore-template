const inquirer = require("inquirer");

const replace = require("./replace");
const { retrieveFilesAndFolders } = require("./retrieve");

const run = async () => {
  const questions = [
    {
      name: "application",
      type: "input",
      message: "What is your application name:",
      validate: function (value) {
        if (value.length) {
          return true;
        } else {
          return "Please enter a value or ctrl+c to cancel.";
        }
      },
    },
  ];

  const answers = await inquirer.prompt(questions);

  const { filesInfo } = await retrieveFilesAndFolders(process.cwd());

  for (const filePath of filesInfo) {
    if (
      !filePath.includes(".git") &&
      !filePath.includes("node_modules") &&
      !filePath.includes(".env.example") &&
      !filePath.includes("/cli/")
    ) {
      await replace.replaceInFileContent({
        token: "APPLICATION_NAME",
        value: answers.application,
        filePath,
      });
    }
  };
};

run();