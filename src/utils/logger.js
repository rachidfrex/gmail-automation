const chalk = require('chalk');

const logger = {
  info: (message) => console.log(chalk.blue(message)),
  success: (message) => console.log(chalk.green(message)),
  error: (message, error) => console.error(chalk.red(message), error),
  warning: (message) => console.log(chalk.yellow(message))
};

module.exports = logger;
