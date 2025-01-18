const fs = require('fs').promises;
const chalk = require('chalk');

async function getLatestEmails(page, numberOfEmails = 5) {
  try {
    await page.waitForSelector('div.I2nW4d[role="list"] div.ksQvef', { timeout: 30000 });
    
    const emails = await page.evaluate((count) => {
      const emails = [];
      const rows = document.querySelectorAll('div.I2nW4d[role="list"] div.ksQvef');
      
      for (let i = 0; i < Math.min(count, rows.length); i++) {
        const row = rows[i];
        
        const sender = row.querySelector('.SGqfCc.FjjIEb span')?.innerText || 'Unknown';
        const subject = row.querySelector('.SGqfCc.HhG5wd span')?.innerText || 'No subject';
        const preview = row.querySelector('.SGqfCc.bEeVec')?.innerText || 'No preview';
        const timestamp = row.querySelector('.C9xYIc span')?.innerText || 'No date';
        const isUnread = row.classList.contains('zE'); // May need adjustment for mobile
        
        emails.push({
          sender,
          subject,
          preview,
          date: timestamp,
          isUnread,
          hasAttachment: !!row.querySelector('.Se5Bse'), // Attachment indicator class may vary
          isStarred: !!row.querySelector('.kYbzg.pNR6wf.fTx1Ge[aria-checked="true"]'),
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
    const emailsData = JSON.parse(
      await fs.readFile('emailCompose.json', 'utf-8')
    );

    for (const recipient of emailsData.recipients) {
      console.log(chalk.blue(`📧 Sending email to: ${recipient.email}`));
      try {
        await composeEmail(page, {
          to: recipient.email,
          subject: recipient.subject,
          body: recipient.body
        });
        // Wait longer between emails to ensure UI is ready
        await page.waitForTimeout(5000);
      } catch (error) {
        console.error(chalk.yellow(`⚠️ Failed to send email to ${recipient.email}:`, error.message));
        // Continue with next email even if current one fails
        continue;
      }
    }
    console.log(chalk.green('✅ Batch emails completed'));
  } catch (error) {
    console.error(chalk.red('❌ Error in batch emails:', error));
    throw error;
  }
}

async function markAsRead(page, numberOfEmails = 5) {
  try {
    await page.waitForSelector('div.ksQvef', { timeout: 30000 });
    
    const unreadEmails = await page.$$('div.ksQvef.zE');
    console.log(chalk.blue(`Found ${unreadEmails.length} unread emails`));
    
    if (unreadEmails.length > 0) {
      for (let i = 0; i < Math.min(numberOfEmails, unreadEmails.length); i++) {
        try {
          await page.waitForSelector('div.kYbzg.pNR6wf.yaP12c[role="checkbox"]', { timeout: 5000 });
          
          await page.evaluate((index) => {
            const checkboxes = document.querySelectorAll('div.kYbzg.pNR6wf.yaP12c[role="checkbox"]');
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

      try {
        await page.waitForSelector('div.kYbzg.pNR6wf.laQMJf.AXeQ0c[data-control-type="ca+5"]', { timeout: 5000 });
        await page.click('div.kYbzg.pNR6wf.laQMJf.AXeQ0c[data-control-type="ca+5"]');
        
        await page.waitForTimeout(1000);
        console.log(chalk.green(`✅ Marked ${Math.min(numberOfEmails, unreadEmails.length)} emails as read`));
      } catch (err) {
        throw new Error('Failed to click mark as read button: ' + err.message);
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
