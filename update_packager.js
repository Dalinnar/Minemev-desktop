const https = require('https');

function obtenerUltimaVersion(owner, repo) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const options = {
    headers: {
      'User-Agent': 'MiApp',
    }
  };

  return new Promise((resolve, reject) => {
    https.get(apiUrl, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        const releaseInfo = JSON.parse(data);
        const latestVersion = releaseInfo.tag_name;
        resolve(latestVersion);
      });
    }).on('error', (err) => {
      reject(new Error('Error al obtener información de GitHub: ' + err.message));
    });
  });
}

module.exports = {
  obtenerUltimaVersion
};