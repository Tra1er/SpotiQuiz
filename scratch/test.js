const https = require('https');

function getSpotifyToken(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const data = 'grant_type=client_credentials';
    const req = https.request('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function fetchSpotify(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Write a small temp file to let user inject their credentials
const template = `
clientId="PUT_YOUR_CLIENT_ID"
clientSecret="PUT_YOUR_CLIENT_SECRET"
`;
require('fs').writeFileSync('credentials.txt', template);
