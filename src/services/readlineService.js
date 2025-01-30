const readline = require('readline');

function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function question(rl, query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function getUserInput() {
    const rl = createReadlineInterface();
    
    try {
        const email = await question(rl, 'Email: ');
        const password = await question(rl, 'Password: ');
        const numberOfEmails = parseInt(await question(rl, 'Number of emails to send: '));
        
        const emailDetails = {
            subject: await question(rl, 'Email subject: '),
            to: await question(rl, 'Email recipient: '),
            body: await question(rl, 'Email body: ')
        };
        
        return {
            email,
            password,
            numberOfEmails,
            emailDetails
        };
    } finally {
        rl.close();
    }
}

module.exports = {
    getUserInput
};
