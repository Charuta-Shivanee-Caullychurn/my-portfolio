const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5000);
const ROOT = __dirname;
const MAX_BODY_BYTES = 100 * 1024;
const CONTACT_RECIPIENT = 'shivanycaully@gmail.com';
const CONTACT_SENDER = 'Portfolio contact <onboarding@resend.dev>';

const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const ROUTES = {
  '/about': 'about.html',
  '/blog': 'blog.html',
  '/career': 'career.html',
  '/contact': 'contact.html',
  '/education': 'education.html',
  '/projects': 'projects.html',
  '/skills': 'skills.html',
};

let connectors;

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejected = true;
        const error = new Error('Request body is too large');
        error.statusCode = 413;
        reject(error);
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!rejected) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', reject);
  });
}

function parseContactPayload(request, rawBody) {
  const contentType = request.headers['content-type'] || '';
  let values;

  if (contentType.includes('application/json')) {
    values = JSON.parse(rawBody);
  } else {
    values = Object.fromEntries(new URLSearchParams(rawBody));
  }

  return {
    name: String(values.name || values['visitor-name'] || '').trim(),
    email: String(values.email || values['visitor-email'] || '').trim(),
    reason: String(values.reason || values['contact-reason'] || '').trim(),
    message: String(values.message || values['visitor-message'] || '').trim(),
    website: String(values.website || '').trim(),
  };
}

function validateContactPayload(payload) {
  if (payload.website) return 'Spam check failed.';
  if (!payload.name || !payload.email || !payload.reason || !payload.message) {
    return 'Please complete every field before sending your message.';
  }
  if (payload.name.length > 120 || payload.reason.length > 160 || payload.message.length > 6000) {
    return 'One or more fields are too long.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 254) {
    return 'Please enter a valid email address.';
  }
  return null;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

async function sendContactEmail(payload) {
  if (!connectors) {
    const { ReplitConnectors } = await import('@replit/connectors-sdk');
    connectors = new ReplitConnectors();
  }

  const safeName = escapeHtml(payload.name);
  const safeEmail = escapeHtml(payload.email);
  const safeReason = escapeHtml(payload.reason);
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br>');
  const response = await connectors.proxy('resend', '/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_SENDER,
      to: [CONTACT_RECIPIENT],
      reply_to: payload.email,
      subject: `[Portfolio] ${payload.reason}`,
      text: `New portfolio contact message\n\nName: ${payload.name}\nEmail: ${payload.email}\nReason: ${payload.reason}\n\n${payload.message}`,
      html: `<h2>New portfolio contact message</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Reason:</strong> ${safeReason}</p><hr><p>${safeMessage}</p>`,
    }),
  });

  if (!response.ok) {
    const providerMessage = await response.text();
    const error = new Error(`Mail provider returned ${response.status}: ${providerMessage.slice(0, 300)}`);
    error.statusCode = 502;
    throw error;
  }
}

async function handleContact(request, response) {
  try {
    const rawBody = await readRequestBody(request);
    let payload;
    try {
      payload = parseContactPayload(request, rawBody);
    } catch {
      return sendJson(response, 400, { ok: false, error: 'Please send a valid form submission.' });
    }

    const validationError = validateContactPayload(payload);
    if (validationError) return sendJson(response, 400, { ok: false, error: validationError });

    await sendContactEmail(payload);
    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error('[contact]', error.message);
    return sendJson(response, error.statusCode || 500, {
      ok: false,
      error: error.statusCode === 502
        ? 'The message could not be delivered right now. Please try again shortly.'
        : 'Something went wrong while sending your message.',
    });
  }
}

function serveStatic(request, response, pathname) {
  const requestedFile = ROUTES[pathname] || (pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
  const filePath = path.resolve(ROOT, requestedFile);

  if (!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== ROOT) {
    return sendJson(response, 403, { ok: false, error: 'Forbidden' });
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'POST' && requestUrl.pathname === '/api/contact') {
    return handleContact(request, response);
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    return serveStatic(request, response, requestUrl.pathname);
  }

  response.writeHead(405, { Allow: 'GET, HEAD, POST' });
  response.end('Method not allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Portfolio server listening on port ${PORT}`);
});