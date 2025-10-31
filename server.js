const fs = require('fs');
const tls = require('tls');
const path = require('path');

// Archivos de certificado y clave
const CERT_FILE = path.join(__dirname, 'cert.pem');
const KEY_FILE = path.join(__dirname, 'priv.pem');

// Configuración TLS
const options = {
  key: fs.readFileSync(KEY_FILE),
  cert: fs.readFileSync(CERT_FILE),
  minVersion: 'TLSv1', // Forzar TLS 1.3
  maxVersion: 'TLSv1.3'
};

// Crear servidor TLS
const server = tls.createServer(options, (socket) => {
  console.log('[+] Cliente conectado:', socket.remoteAddress, socket.remotePort);
  console.log('[*] Cipher negociada:', socket.getCipher());

  // Leer datos del cliente
  socket.on('data', (data) => {
    console.log('[>] Recibido:', data.toString());
    socket.write('Hola desde servidor TLS 1.3 Node.js!\n');
  });

  socket.on('end', () => {
    console.log('[*] Cliente desconectado');
  });

  socket.on('error', (err) => {
    console.error('[!] Error TLS:', err);
  });
});

// Escuchar puerto
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`[+] Servidor TLS escuchando en el puerto ${PORT}`);
});
