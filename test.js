
(async()=>{
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
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',

    rejectUnauthorized: false,  // Temporalmente para debugging
  // Sin SNI ni ALPN
  servername: "192.168.1.128",
  ALPNProtocols: [],
  // Certificados (si necesitas autenticación mutua)
    key: fs.readFileSync('./priv.pem'),
    cert: fs.readFileSync('./cert.pem'),
    
  // Ciphers equivalentes a los del ClientHello Crankshaft
  ciphers: [
    "AES256-GCM-SHA384",
    "AES128-GCM-SHA256",
    "AES256-SHA256",
    "AES128-SHA256",
    "AES256-SHA",
    "AES128-SHA",
    "DES-CBC3-SHA",

    "DHE-RSA-AES256-SHA256",
    "DHE-RSA-AES128-SHA256",
    "DHE-RSA-AES256-SHA",
    "DHE-RSA-AES128-SHA",
  ].join(':'),
  pskCallback: (res)=>{
    console.log(res)
  }
  };

  // Conexión TLS
  const socket = tls.connect(options, () => {
  console.log('🔗 Handshake TLS completado');
  console.log('Versión negociada:', socket.getProtocol());
  console.log('Cipher suite:', socket.getCipher());
  console.log('Certificado CN:', socket.getPeerCertificate().subject.CN);
  console.log('Emitido por:', socket.getPeerCertificate().issuer.CN);

  // Envía algo de prueba si el protocolo del vehículo lo requiere
  });
  const protobuf = require('protobufjs');

  const aa_protos = new aasdk_protobuf()
  await aa_protos.loadProtobufs()
  console.log('proto decodificado: ', JSON.stringify(aa_protos.root.lookupType('ServiceDiscoveryResponse').decode(aa_protos.encodeServiceDiscoveryResponse())))

  //console.log('proto decodificado: ', aa_protos.encodeServiceDiscoveryResponse(), aa_protos.root.lookupType('ServiceDiscoveryResponse').decode(aa_protos.encodeServiceDiscoveryResponse()))
  socket.on('data', (data) => {
    console.log('datos recibidos: ', data)
    let headers = Buffer.alloc(4)
    if(data.readUint8(1) === 0x05){
      console.log('recive tls discovery Request: ')
      socket.write(Buffer.from('00060a1408041a10080110031a080880f7021010180228010a1308051a0f080110011a0708807d1010180128010a1308061a0f080110021a0708807d1010180128010a1508031a110803220b0803100118002000288c0128010a0f08092a0b0801120708807d101018010a100801120c0a02080d0a0208010a02080a0a0c08082208120608800f10b8080a12080a320e0a00120affffffffffffffffff0130015800720d4372616e6b73686166742d4e47780082010d0a0b08b81710e80718c80120058a01530a0a4372616e6b73686166741209556e6976657273616c1a04323031382210323032343131303832323135303938382a0366317832154372616e6b73686166742d4e47204175746f6170703a01314203312e30', 'hex'))

    }else if(data.readUint8(1) === 0x07){
      headers = Buffer.alloc(2)
      headers.writeUInt16BE(0x08, 0)
      const id_service = data.readUint8(data.length - 1)
      const priority = data.readUint8(data.length - 3)
      console.log(`recive  open request: id_service: ${id_service}, priority: ${priority}`)
      
        const ChannelOpenResponse = aa_protos.ChannelOpenResponse.create({
          status: 0
        })
        socket.write(Buffer.concat([headers, aa_protos.ChannelOpenResponse.encode(ChannelOpenResponse).finish()]))
     

      
    }else if(data.readUint8(1) === 0x12){ //--> voz session request
      headers = Buffer.alloc(2)
      headers.writeUInt16BE(0x13, 0)

      console.log('recive voice session focus')
      const AudioFocusNotification = aa_protos.AudioFocusNotification.create({
        focusState: 3
      })
            
      socket.write(Buffer.concat([headers, aa_protos.AudioFocusNotification.encode(AudioFocusNotification).finish()]))
    }


      
  })
  socket.on('error', (err)=>{
      console.error(new Error(err))
      console.error(new Error(err.stack))
      socket.destroy()
  })
})()