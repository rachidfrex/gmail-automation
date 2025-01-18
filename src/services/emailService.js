const fs = require('fs').promises;
const chalk = require('chalk');

async function getLatestEmails(page, numberOfEmails = 5) {
  try {
    await page.waitForSelector('tr[role="row"]', { timeout: 30000 });
    
    const emails = await page.evaluate((count) => {
      const emails = [];
      const rows = document.querySelectorAll('tr[role="row"]');
      
      for (let i = 0; i < Math.min(count, rows.length); i++) {
        const row = rows[i];
        
        const sender = row.querySelector('.yP')?.innerText || 
                      row.querySelector('.zF')?.innerText || 'Unknown';
        
        const subject = row.querySelector('.bog span')?.innerText || 'No subject';
         
        const preview = row.querySelector('.y2')?.innerText
          .replace(/^\s*-\s*/, '') || 'No preview';
        
        const timestamp = row.querySelector('.xW span[title]')?.getAttribute('title') || 
                         row.querySelector('.xW span')?.innerText || 'No date';
        
        const isUnread = row.classList.contains('zE');
        
        emails.push({
          sender,
          subject,
          preview,
          date: timestamp,
          isUnread,
          hasAttachment: !!row.querySelector('.bzX'),
          isStarred: !!row.querySelector('.T-KT.T-KT-Jp'),
        });
      }
      return emails;
    }, numberOfEmails);

    await fs.writeFile('emails.json', JSON.stringify(emails, null, 2));
    
    console.log(chalk.green('\n📧 Latest emails found:', emails.length));
    emails.forEach((email, i) => {
      console.log(chalk.cyan(`\n📩 Email ${i + 1}:`));
      console.log(chalk.white(`   From: ${email.sender}`));
      console.log(chalk.white(`   Subject: ${email.subject}`));
      console.log(chalk.white(`   Date: ${email.date}`));
      console.log(chalk.white(`   Status: ${email.isUnread ? '🆕 Unread' : '✓ Read'}`));
    });

    return emails;
  } catch (error) {
    console.error(chalk.red('❌ Error getting emails:', error));
    throw error;
  }
}

async function composeEmail(page, { to, subject, body }) {
  try {
    await page.waitForSelector('div[role="button"][gh="cm"]', { timeout: 60000 });
    await page.click('div[role="button"][gh="cm"]');
    
    await page.waitForSelector('div[role="dialog"]', { timeout: 60000 });
    
    await page.waitForSelector('input.agP.aFw[aria-label="To recipients"]', { timeout: 60000 });
    await page.fill('input.agP.aFw[aria-label="To recipients"]', to);
    
    await page.waitForSelector('input[name="subjectbox"].aoT', { timeout: 60000 });
    await page.fill('input[name="subjectbox"].aoT', subject);
    
    await page.waitForSelector('div.Am.Al.editable[role="textbox"]', { timeout: 60000 });
    await page.fill('div.Am.Al.editable[role="textbox"]', body);

    await page.waitForTimeout(1000);
    
    await page.click('div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3[role="button"]');
    console.log(chalk.green('✅ Email sent successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Error sending email:', error));
    throw error;
  }
}

async function sendBatchEmails(page) {
  try {
    const emailsData = JSON.parse(
      await fs.readFile('emailCompose.json', 'utf-8')
    );

    for (const recipient of emailsData.recipients) {
      console.log(chalk.blue(`📧 Sending email to: ${recipient.email}`));
      await composeEmail(page, {
        to: recipient.email,
        subject: recipient.subject,
        body: recipient.body
      });
      await page.waitForTimeout(3000);
    }
    console.log(chalk.green('✅ Batch emails sent successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Error sending batch emails:', error));
    throw error;
  }
}

async function markAsRead(page, numberOfEmails = 5) {
  try {
    // Wait for the unread emails to be visible
    await page.waitForSelector('tr.zA.zE', { timeout: 30000 });
    
    // Get all unread emails
    const unreadEmails = await page.$$('tr.zA.zE');
    console.log(chalk.blue(`Found ${unreadEmails.length} unread emails`));
    
    if (unreadEmails.length > 0) {
      // Select emails one by one
      for (let i = 0; i < Math.min(numberOfEmails, unreadEmails.length); i++) {
        try {
          // Wait for the checkbox to be ready
          await page.waitForSelector('tr.zA.zE div[role="checkbox"]', { timeout: 5000 });
          
          // Click the checkbox using evaluate to ensure proper event handling
          await page.evaluate((index) => {
            const checkboxes = document.querySelectorAll('tr.zA.zE div[role="checkbox"]');
            if (checkboxes[index]) {
              checkboxes[index].click();
            }
          }, i);
          
          await page.waitForTimeout(500);
        } catch (err) {
          console.error(chalk.yellow(`⚠️ Couldn't select email ${i + 1}:`, err.message));
          continue;
        }
      }

      // Wait for and click the "Mark as read" button
      try {
        await page.waitForSelector('[role="button"][aria-label="Mark as read"]', { timeout: 5000 });
        await page.click('[role="button"][aria-label="Mark as read"]');
        
        await page.waitForTimeout(1000);
        console.log(chalk.green(`✅ Marked ${Math.min(numberOfEmails, unreadEmails.length)} emails as read`));
      } catch (err) {
        // Try alternative selector if the first one fails
        try {
          await page.evaluate(() => {
            const markAsReadBtn = document.querySelector('div[data-tooltip="Mark as read"]');
            if (markAsReadBtn) markAsReadBtn.click();
          });
          console.log(chalk.green(`✅ Marked emails as read using alternative method`));
        } catch (altErr) {
          throw new Error('Failed to click mark as read button: ' + err.message);
        }
      }
    } else {
      console.log(chalk.yellow('📫 No unread emails found'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Error marking emails as read:', error));
    throw error;
  }
}

module.exports = {
  getLatestEmails,
  composeEmail,
  sendBatchEmails,
  markAsRead
};
