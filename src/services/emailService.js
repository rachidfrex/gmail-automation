const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

const SELECTORS = {
  mobile: { 
    composeButton: '[gh="cm"]',
    emailList: '.UI table tbody tr',
    checkbox: 'div[role="checkbox"]',
    subject: 'input[name="subjectbox"]',
    body: 'div[role="textbox"]',
    send: 'div[role="button"][aria-label*="Send"]'
  },
  desktop: {
    composeButton: 'div[gh="cm"]',
    emailList: 'div[role="main"] tr',
    checkbox: 'div[role="checkbox"]',
    subject: 'input[name="subjectbox"]',
    body: 'div[role="textbox"]',
    send: 'div[role="button"][aria-label*="Send"]'
  }
};

async function getLatestEmails(page, count) {
  try {
    await page.waitForSelector(SELECTORS.desktop.emailList);
    const emails = await page.$$eval(SELECTORS.desktop.emailList, (rows, count) => {
      return rows.slice(0, count).map(row => {
        const subject = row.querySelector('td:nth-child(6)')?.textContent || '';
        const sender = row.querySelector('td:nth-child(4)')?.textContent || '';
        return { subject, sender };
      });
    }, count);
    
    console.log(`Found ${emails.length} emails`);
    return emails;
  } catch (error) {
    throw new Error(`Failed to get latest emails: ${error.message}`);
  }
}

async function composeEmail(page, { to, subject, body }) {
  try {
    // Click compose button (the floating action button)
    await page.waitForSelector('div.LuRb0e div.kYbzg[aria-label="Compose"]', { timeout: 10000 });
    await page.click('div.LuRb0e div.kYbzg[aria-label="Compose"]');
    await page.waitForTimeout(2000);

    // Wait for compose form to be visible and fill recipient
    await page.waitForSelector('input#composeto', { timeout: 10000 });
    await page.fill('input#composeto', to);
    await page.waitForTimeout(1000);

    // Fill subject
    await page.waitForSelector('input#cmcsubj', { timeout: 10000 });
    await page.fill('input#cmcsubj', subject);
    await page.waitForTimeout(1000);

    // Fill message body
    await page.waitForSelector('div#cmcbody[contenteditable="true"]', { timeout: 10000 });
    await page.fill('div#cmcbody[contenteditable="true"]', body);
    await page.waitForTimeout(1000);

    // Click send button with correct mobile selector
    await page.waitForSelector('div.kYbzg.pNR6wf.laQMJf.AXeQ0c.YaxK2.DAy7Hb[data-control-type="cmaasend+105"]', { timeout: 10000 });
    await page.click('div.kYbzg.pNR6wf.laQMJf.AXeQ0c.YaxK2.DAy7Hb[data-control-type="cmaasend+105"]');
    
    // Wait for the compose window to close
    await page.waitForTimeout(3000);
    console.log(chalk.green('✅ Email sent successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Error sending email:', error));
    throw error;
  }
}

async function sendBatchEmails(page) {
  try {
    const emailData = JSON.parse(
      await fs.readFile(path.join(__dirname, '../../emailCompose.json'), 'utf8')
    );

    for (const email of emailData) {
      await page.waitForTimeout(2000 + Math.random() * 3000);
      
      // Click compose with retry
      await retryOperation(async () => {
        await page.click(SELECTORS.desktop.composeButton);
      });

      // Fill email details with human-like delays
      await page.waitForSelector('input[name="to"]');
      await page.fill('input[name="to"]', email.to);
      await page.waitForTimeout(1000 + Math.random() * 2000);
      
      await page.fill(SELECTORS.desktop.subject, email.subject);
      await page.waitForTimeout(1000 + Math.random() * 2000);
      
      await page.fill(SELECTORS.desktop.body, email.body);
      await page.waitForTimeout(2000 + Math.random() * 3000);
      
      await page.click(SELECTORS.desktop.send);
      console.log(`Sent email to ${email.to}`);
    }
  } catch (error) {
    throw new Error(`Failed to send batch emails: ${error.message}`);
  }
}

async function markAsRead(page, count) {
  try {
    const emails = await page.$$(SELECTORS.desktop.emailList);
    for (let i = 0; i < Math.min(count, emails.length); i++) {
      await page.waitForTimeout(1000 + Math.random() * 2000);
      await emails[i].click();
    }
  } catch (error) {
    throw new Error(`Failed to mark emails as read: ${error.message}`);
  }
}

async function retryOperation(operation, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await operation();
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

module.exports = {
  getLatestEmails,
  composeEmail,
  sendBatchEmails,
  markAsRead
};
