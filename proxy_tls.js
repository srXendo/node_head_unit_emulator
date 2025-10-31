const tls = require("tls");
const crypto = require('crypto')
const aasdk_protobuf = require('./helpers/aasdk_protobuf')
// crankshaft_tls_client.js
const fs = require('fs');

// Ajusta a la IP/puerto reales del servidor del vehículo
const HOST = 'CARNETWORK'; // <— cámbialo
const PORT = 5000;          // <— cámbialo

const options = {
  
  host: HOST,
  port: PORT,
  // TLS 1.3 únicamente
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',
  rejectUnauthorized :false,
  // Sin SNI ni ALPN
  servername: undefined,
  ALPNProtocols: [],
  // Certificados (si necesitas autenticación mutua)

  secureContext: tls.createSecureContext({
    key: fs.readFileSync('./priv.pem'),
    cert: fs.readFileSync('./cert.pem'),
  }),
  // Ciphers equivalentes a los del ClientHello Crankshaft
  ciphers: [
    "AES256-GCM-SHA384",
    "AES128-GCM-SHA256",
    "AES256-SHA256",
    "AES128-SHA256",
    "AES256-SHA",
    "AES128-SHA",
    "DES-CBC3-SHA",
    "ECDHE-RSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES256-SHA384",
    "ECDHE-RSA-AES128-SHA256",
    "ECDHE-RSA-AES256-SHA",
    "ECDHE-RSA-AES128-SHA",
    "DHE-RSA-AES256-SHA256",
    "DHE-RSA-AES128-SHA256",
    "DHE-RSA-AES256-SHA",
    "DHE-RSA-AES128-SHA",
  ].join(':'),
  pskCallback: (res)=>{
    console.log(res)
  }
  // Curvas ECDHE (X25519 + P-256)


  // Desactivar extensiones modernas innecesarias


};

// Conexión TLS
const server = tls.createServer(options, () => {
  
});
server.listen(5000,(con)=>{

})
server.on("")