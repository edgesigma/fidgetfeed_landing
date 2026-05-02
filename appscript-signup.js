/**
 * DROP-IN REPLACEMENT FOR YOUR WAITLIST WEB APP
 *
 * What it does:
 * - Accepts POSTs from your landing page (doPost)
 * - Appends a row to the "Waitlist" sheet
 * - Sends an autoresponder welcome email via Resend
 * - Emails you an alert for new submissions (rate-limited)
 * - Returns plain-text "OK"
 *
 * Activation:
 * - Run authorizeAll() once in the Apps Script editor to grant
 *   all required permissions.
 * - Set RESEND_API_KEY in Script Properties
 *   (Project Settings > Script Properties).
 */

/** CONFIG **/
const SHEET_NAME = 'Waitlist';

// Where alerts go (REQUIRED for alerts)
const NOTIFY_EMAIL = 'yell@mauricewingfield.com';

// Optional shared token guard (set to '' to disable)
const REQUIRED_TOKEN =
  'wow_look_at_you_hacker-viewing_pagesource_like_a_champ';

// Rate limit: notify at most once per email per window (ms)
const NOTIFY_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

// Autoresponder from address (must match a verified domain in Resend)
const AUTORESPONDER_FROM =
  'Maurice @ Fidget Feed <maurice@fidgetfeed.com>';
const AUTORESPONDER_REPLY_TO = 'yell@mauricewingfield.com';
/** END CONFIG **/

function doPost(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput('OK')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  if (REQUIRED_TOKEN) {
    const token = (e.parameter.token || '').trim();
    if (token !== REQUIRED_TOKEN) {
      return ContentService.createTextOutput('FORBIDDEN')
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_NAME)
    || ss.insertSheet(SHEET_NAME);

  const submittedAt = new Date();
  const email    = (e.parameter.email    || '').trim();
  const name     = (e.parameter.name     || '').trim();
  const source   = (e.parameter.source   || '').trim();
  const page     = (e.parameter.page     || '').trim();
  const ua       = (e.parameter.ua       || '').trim();
  const origin   = (e.parameter.origin   || '').trim();
  const referrer = (e.parameter.referrer || '').trim();

  sh.appendRow([
    submittedAt, email, name, source, page, ua,
    origin, referrer
  ]);

  // Autoresponder via Resend (once per email address)
  if (email) {
    sendAutoresponder_(email, name);
  }

  // Email alert (rate-limited per email)
  if (NOTIFY_EMAIL) {
    const props = PropertiesService.getScriptProperties();
    const key = 'notified_'
      + (email ? email.toLowerCase() : 'no_email');
    const last = Number(props.getProperty(key) || 0);

    if (!last || (Date.now() - last) > NOTIFY_WINDOW_MS) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: email || undefined,
        subject: 'New waitlist signup',
        body:
          'New signup\n\n' +
          'Time: ' + submittedAt + '\n' +
          'Email: ' + email + '\n' +
          'Name: ' + name + '\n' +
          'Source: ' + source + '\n' +
          'Page: ' + page + '\n' +
          (referrer ? 'Referrer: ' + referrer + '\n' : 'Referrer: (empty)\n') +
          (origin ? 'Origin: ' + origin + '\n' : '') +
          'UA: ' + ua + '\n'
      });
      props.setProperty(key, String(Date.now()));
    }
  }

  return ContentService.createTextOutput('OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Sends a one-time welcome email via Resend.
 * Skips if already sent.
 */
function sendAutoresponder_(email, name) {
  const props = PropertiesService.getScriptProperties();
  const key = 'welcomed_' + email.toLowerCase();
  if (props.getProperty(key)) return;

  const apiKey = props.getProperty('RESEND_API_KEY');
  if (!apiKey) {
    console.error(
      'RESEND_API_KEY not set in Script Properties'
    );
    return;
  }

  const greeting = name
    ? ('Greetings, ' + name + '.')
    : 'Greetings.';

  const textBody =
    greeting + '\n' +
    'Thanks for signing up for Fidget Feed. ' +
    'We\'re building something we think you\'ll ' +
    'really like.\n\n' +
    'Shortly we\'ll begin the closed beta test ' +
    'Google requires in order to get the app into ' +
    'the Play Store. When that begins, you\'ll get ' +
    'an install link giving you access to install ' +
    'and use the app.\n\n' +
    'We ask that you keep the app installed for ' +
    'the full test. You\'re not required to pay ' +
    'anything. We\'d appreciate any feedback you ' +
    'have during the test.\n\n' +
    'We kept the signup short on purpose, but ' +
    'I\'d love to learn a bit more about what ' +
    'brought you here. Quick question: What\'s ' +
    'the one thing about your phone habits that ' +
    'you wish you could change? No wrong answers. ' +
    'Just hit reply and let me know. It helps us ' +
    'build something that actually matters to ' +
    'you.\n\n' +
    'More soon,\n' +
    'Maurice';

  const htmlBody =
    '<p>' + greeting + '<br>' +
    'Thanks for signing up for Fidget Feed. ' +
    'We\'re building something we think you\'ll ' +
    'really like.</p>' +
    '<p>Shortly we\'ll begin the closed beta test ' +
    'Google requires in order to get the app into ' +
    'the Play Store. When that begins, you\'ll ' +
    'get an install link giving you access to ' +
    'install and use the app.</p>' +
    '<p>We ask that you keep the app installed ' +
    'for the full test. You\'re not required to ' +
    'pay anything. We\'d appreciate any feedback ' +
    'you have during the test.</p>' +
    '<p>We kept the signup short on purpose, but ' +
    'I\'d love to learn a bit more about what ' +
    'brought you here. Quick question: What\'s ' +
    'the one thing about your phone habits that ' +
    'you wish you could change? No wrong answers. ' +
    'Just hit reply and let me know. It helps us ' +
    'build something that actually matters to ' +
    'you.</p>' +
    '<p>More soon,<br>Maurice</p>';

  const payload = {
    from: AUTORESPONDER_FROM,
    to: [email],
    reply_to: AUTORESPONDER_REPLY_TO,
    subject: 'Welcome to Fidget Feed',
    html: htmlBody,
    text: textBody
  };

  const res = UrlFetchApp.fetch(
    'https://api.resend.com/emails',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  const code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    const resBody = JSON.parse(res.getContentText());
    props.setProperty(
      key, resBody.id || String(Date.now())
    );
  } else {
    console.error(
      'Resend error (' + code + '): '
      + res.getContentText()
    );
  }
}

function doGet() {
  return ContentService.createTextOutput('OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * RUN THIS ONCE FROM THE EDITOR to grant all required
 * permissions (MailApp, UrlFetchApp, PropertiesService).
 * Select this function from the dropdown and click Run.
 */
function authorizeAll() {
  // Triggers UrlFetchApp permission
  UrlFetchApp.fetch('https://api.resend.com/emails', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer test' },
    payload: '{}',
    muteHttpExceptions: true
  });

  // Triggers MailApp permission
  MailApp.sendEmail(
    NOTIFY_EMAIL,
    'Apps Script authorized',
    'All scopes granted.'
  );
}
