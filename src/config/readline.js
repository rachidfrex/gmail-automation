const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getUserInput() {
  console.log(chalk.blue.bold('🔐 Gmail Automation Setup'));
  
  const email = await question(chalk.yellow('Enter your email: '));
  const password = await question(chalk.yellow('Enter your password: '));
  const numberOfEmails = await question(chalk.yellow('Number of emails to fetch (default 5): '));
  
  rl.close();
  
  return {
    email,
    password,
    numberOfEmails: parseInt(numberOfEmails) || 5
  };
}

module.exports = { getUserInput };
