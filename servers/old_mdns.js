const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const C_PROTO = require('../helpers/aasdk_protobuf')
let last_flag = 0x000b;
class CrankshaftEmulator {
    constructor() {
        this.sessionId = 'aa58cee50637f187';
        this.sequence = 0x87;
        this.C_PROTO = new C_PROTO()
        this.C_PROTO.loadProtobufs()
        this.movil_socket = null;
        this.tls_socket = null
    }
    nextSequence() {
        this.sequence++;
        if (this.sequence > 0xff) this.sequence = 0x00;
        return this.sequence.toString(16).padStart(2, '0');
    }
    createMessage(type, payload) {
        const payloadHex = Buffer.isBuffer(payload) ? payload.toString('hex') : payload;
        const length = (payloadHex.length / 2 + 4).toString(16).padStart(4, '0');
        const typeStr = type.toString(16).padStart(4, '0');
        return Buffer.from(length + typeStr + payloadHex, 'hex');
    }
    parseMessage(data){
        const id_message = data.readUint16BE(4)
        const length_payload = data.readUint16BE(2)

        const payload = data.slice(4, length_payload)
        if(payload.length === length_payload){
            console.log('payload coincide con length')
        }
        return {
            raw: data,
            id_message,
            length_payload,
            payload
        }
    }
    add_head_handshack(data){
        const prebuf = Buffer.concat([data])
        const length_payload = prebuf.length + 2
        const header_byte = 0x0003
        const header_flag = 0x0003
        const header_buf = Buffer.alloc(6)
        header_buf.writeUint16BE(header_byte, 0)
        header_buf.writeUint16BE(length_payload, 2)
        header_buf.writeUint16BE(header_flag, 4)
        console.log('cabeceras añadidas: ', Buffer.concat([header_buf, prebuf]).length, 289)
        return Buffer.concat([header_buf, prebuf])
        

    }
    async handleClientConnection(socket) {
        try{
            console.log('📱 Teléfono móvil conectado: ', socket.remoteAddress, socket.remotePort);

            // 1. Handshake inicial
            console.log(socket.remoteAddress === '::ffff:192.168.1.135', socket.remoteAddress)
            if(socket.remoteAddress === '::ffff:192.168.1.135'){
                    setTimeout(()=>{
                    const handshakeResponse = Buffer.from('00030006000100010001', 'hex');
                    console.log('📤 Enviando handshake:', handshakeResponse.toString('hex'));
                    socket.write(handshakeResponse);
                    }, 3000)


            }

            let tlsReady = false;
            let sslSocket = null;

            socket.on('data', (data) => {
            
                
                if(socket.remoteAddress === '::ffff:192.168.1.135'){
                console.log('\n📨 RECIBIDO:', data.toString('hex') + '...');
                const message = this.parseMessage(data)
                last_flag = data.readUint16BE(0)
                switch(message.id_message){
                    case 0x08:
                        console.log('recibido respuesta ssl', data.toString('hex'))
                        socket.write('')
                    break;
                    case 0x02:
                        //const clientHello = this.createEncapsulatedSSL();
                        this.movil_socket = socket

                        console.log('send tls_socket', this.add_head_handshack(this.tls_response).toString('hex'))


                        socket.write(this.add_head_handshack(this.tls_response))

                        break;
                    case 0x03:
                        if(data.readUint8(6) === 0x14){
                            console.log('send hu to movil check: ', '0003000400040800')

        
                                this.tls_socket.write(data.slice(6, data.length));
                                socket.write(Buffer.from('0003000400040800', 'hex'))

                            
                        }else{
                            
                            this.tls_socket.write(data.slice(6, data.length));


                        }
                        break;
                    case 5891:
                        last_flag = data.readUint16BE(0)
                        console.log(5891)
                        if(data.readUint8(8) === 0x1e){
                            switch(data.readUint8(0)){
                                
                                case 0x04:
                                case 0x05:
                                case 0x03:
                                default:
                                    console.log('envio! al tls')
                                    console.log(data.slice(4, data.length))

                                    break;
                                
                            }
                            this.tls_socket.write(data.slice(4), (err)=>{
                                if(err){
                                    console.error(new Error(data.toString('hex')))
                                    console.error(new Error(err))
                                }
                            })
                        }else if(data.readUint8(8) === 0x1c){
                            this.tls_socket.write(data.slice(4, data.length))
                        }else{
                            this.tls_socket.write(data.slice(4, data.length))
                        }
                        
                    
                        
                        //socket.write(Buffer.from('000b0111170303010caa58cee50637f188f83762a9a974502c778c6ae1b398ce1e87a0793c58a6448b1cd602b990fb2f1d0c63d3f67cbd9fc1200310e6526a2c7e25664cb9e28d018ca3db376b65d21b93cd2c570ccba34511efebffef20839a2bfc375b01a730fb23d8d365731dd4a24dd783e01e4195a7b752ddb1e88bd9aeb7f56a21b50a26ad6767372b664935f5290911f0d10faee8b1747b95642b596246e5877bbc30fbc198ffb26afa7c8b22b8726d58213d4f672dcd8b9e54fae5e220ab32d38664b9c0d1aee45550dd61c6902a5b8f89d996463fd287eb3000951240b3378786b61e8fedb03962b5b45b3643fba5c586651fa850ab1f1ae06c1c179542366691233796e9ee2e241ad017563b8e9f4b52','hex'))
                        break;
                    default:
                        console.error(new Error('message id no identificado: '+message.id_message, ));
                }
                }else{
                    console.log('\n📨<-- TLS RECIBIDO:', data.toString('hex') + '...');
                    switch(data.readUint8(2)){ //handshack type
                        case 0x03://client recive responseHello
                            if(data.readUint8(0) === 0x17){
                                // ANTES de enviar, verifica el estado del socket



                                if(data.readUint8(4) === 0x1e){
                                    const buf_header = Buffer.alloc(4);
                                    buf_header.writeUint16BE(last_flag, 0);
                                    buf_header.writeUint16BE(data.length, 2);
                                    const fullMessage = Buffer.concat([buf_header, data]);
                                    this.movil_socket.write(fullMessage)
                                    console.log('send to movil socket', last_flag, fullMessage.toString('hex').substring(0, 100) + '...');
                                }else{
                                    const buf_header = Buffer.alloc(4);
                                    buf_header.writeUint16BE(last_flag, 0);
                                    buf_header.writeUint16BE(data.length, 2);
                                    const fullMessage = Buffer.concat([buf_header, data]);
                                    this.movil_socket.write(fullMessage)
                                    console.log('send to movil socket else', fullMessage.toString('hex').substring(0, 100) + '...');
                                }

                            }else{
                                this.movil_socket.write(this.add_head_handshack(data))
                            }
                            break;
                        case 0x01://client said hello to server hello yes android auto (smartphone) is a server, car is a tls client
                            this.tls_socket = socket
                            this.tls_response = data
                            break;
                        default:
                            console.error(`handhsack client node not recognice: ${data.readUint8(2)}`);
                            break;
                    }

                }

            });

            socket.on('close', () => {
                console.log('🔌 Teléfono móvil desconectado');
                this.sequence = 0x87;
            });
            socket.on('error', (err)=>{
                console.error(new Error(err))
                console.error(new Error(err.stack))
            })
        }catch(err){
            console.error(new Error(err))
            console.error(new Error(err.stack))
        }
        
    }

    
    start(port = 5277) {
        this.server = net.createServer((socket) => {
            this.handleClientConnection(socket);
        });

        this.server.listen(5003, () => {
            console.log(`🚀 Servidor Crankshaft emulado en puerto ${port}`);
            console.log('⏳ Esperando conexión de teléfono móvil...');
        });
    }
    getCrankshaftCertificate() {
        // Certificado JVC de Crankshaft (del código que compartiste)
        return `-----BEGIN CERTIFICATE-----
MIIDKjCCAhICARswDQYJKoZIhvcNAQELBQAwWzELMAkGA1UEBhMCVVMxEzARBgNV
BAgMCkNhbGlmb3JuaWExFjAUBgNVBAcMDU1vdW50YWluIFZpZXcxHzAdBgNVBAoM
Fkdvb2dsZSBBdXRvbW90aXZlIExpbmswJhcRMTQwNzA0MDAwMDAwLTA3MDAXETQ1
MDQyOTE0MjgzOC0wNzAwMFMxCzAJBgNVBAYTAkpQMQ4wDAYDVQQIDAVUb2t5bzER
MA8GA1UEBwwISGFjaGlvamkxFDASBgNVBAoMC0pWQyBLZW53b29kMQswCQYDVQQL
DAIwMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAM911mNnUfx+WJtx
uk06GO7kXRW/gXUVNQBkbAFZmVdVNvLoEQNthi2X8WCOwX6n6oMPxU2MGJnvicP3
6kBqfHhfQ2Fvqlf7YjjhgBHh0lqKShVPxIvdatBjVQ76aym5H3GpkigLGkmeyiVo
VO8oc3cJ1bO96wFRmk7kJbYcEjQyakODPDu4QgWUTwp1Z8Dn41ARMG5OFh6otITL
XBzj9REkUPkxfS03dBXGr5/LIqvSsnxib1hJ47xnYJXROUsBy3e6T+fYZEEzZa7y
7tFioHIQ8G/TziPmvFzmQpaWMGiYfoIgX8WoR3GD1diYW+wBaZTW+4SFUZJmRKgq
TbMNFkMCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAsGdH5VFn78WsBElMXaMziqFC
zmilkvr85/QpGCIztI0FdF6xyMBJk/gYs2thwvF+tCCpXoO8mjgJuvJZlwr6fHzK
Ox5hNUb06AeMtsUzUfFjSZXKrSR+XmclVd+Z6/ie33VhGePOPTKYmJ/PPfTT9wvT
93qswcxhA+oX5yqLbU3uDPF1ZnJaEeD/YN45K/4eEA4/0SDXaWW14OScdS2LV0Bc
YmsbkPVNYZn37FlY7e2Z4FUphh0A7yME2Eh/e57QxWrJ1wubdzGnX8mrABc67ADU
U5r9tlTRqMs7FGOk6QS2Cxp4pqeVQsrPts4OEwyPUyb3LfFNo3+sP111D9zEow==
-----END CERTIFICATE-----`;
    }

    getCrankshaftPrivateKey() {
        // Clave privada JVC de Crankshaft  
        return `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAz3XWY2dR/H5Ym3G6TToY7uRdFb+BdRU1AGRsAVmZV1U28ugR
A22GLZfxYI7Bfqfqgw/FTYwYme+Jw/fqQGp8eF9DYW+qV/tiOOGAEeHSWopKFU/E
i91q0GNVDvprKbkfcamSKAsaSZ7KJWhU7yhzdwnVs73rAVGaTuQlthwSNDJqQ4M8
O7hCBZRPCnVnwOfjUBEwbk4WHqi0hMtcHOP1ESRQ+TF9LTd0Fcavn8siq9KyfGJv
WEnjvGdgldE5SwHLd7pP59hkQTNlrvLu0WKgchDwb9POI+a8XOZClpYwaJh+giBf
xahHcYPV2Jhb7AFplNb7hIVRkmZEqCpNsw0WQwIDAQABAoIBAB2u7ZLheKCY71Km
bhKYqnKb6BmxgfNfqmq4858p07/kKG2O+Mg1xooFgHrhUhwuKGbCPee/kNGNrXeF
pFW9JrwOXVS2pnfaNw6ObUWhuvhLaxgrhqLAdoUEgWoYOHcKzs3zhj8Gf6di+edq
SyTA8+xnUtVZ6iMRKvP4vtCUqaIgBnXdmQbGINP+/4Qhb5R7XzMt/xPe6uMyAIyC
y5Fm9HnvekaepaeFEf3bh4NV1iN/R8px6cFc6ELYxIZc/4Xbm91WGqSdB0iSriaZ
TjgrmaFjSO40tkCaxI9N6DGzJpmpnMn07ifhl2VjnGOYwtyuh6MKEnyLqTrTg9x0
i3mMwskCgYEA9IyljPRerXxHUAJt+cKOayuXyNt80q9PIcGbyRNvn7qIY6tr5ut+
ZbaFgfgHdSJ/4nICRq02HpeDJ8oj9BmhTAhcX6c1irH5ICjRlt40qbPwemIcpybt
mb+DoNYbI8O4dUNGH9IPfGK8dRpOok2m+ftfk94GmykWbZF5CnOKIp8CgYEA2Syc
5xlKB5Qk2ZkwXIzxbzozSfunHhWWdg4lAbyInwa6Y5GB35UNdNWI8TAKZsN2fKvX
RFgCjbPreUbREJaM3oZ92o5X4nFxgjvAE1tyRqcPVbdKbYZgtcqqJX06sW/g3r/3
RH0XPj2SgJIHew9sMzjGWDViMHXLmntI8rVA7d0CgYBOr36JFwvrqERN0ypNpbMr
epBRGYZVSAEfLGuSzEUrUNqXr019tKIr2gmlIwhLQTmCxApFcXArcbbKs7jTzvde
PoZyZJvOr6soFNozP/YT8Ijc5/quMdFbmgqhUqLS5CPS3z2N+YnwDNj0mO1aPcAP
STmcm2DmxdaolJksqrZ0owKBgQCD0KJDWoQmaXKcaHCEHEAGhMrQot/iULQMX7Vy
gl5iN5E2EgFEFZIfUeRWkBQgH49xSFPWdZzHKWdJKwSGDvrdrcABwdfx520/4MhK
d3y7CXczTZbtN1zHuoTfUE0pmYBhcx7AATT0YCblxrynosrHpDQvIefBBh5YW3AB
cKZCOQKBgEM/ixzI/OVSZ0Py2g+XV8+uGQyC5XjQ6cxkVTX3Gs0ZXbemgUOnX8co
eCXS4VrhEf4/HYMWP7GB5MFUOEVtlLiLM05ruUL7CrphdfgayDXVcTPfk75lLhmu
KAwp3tIHPoJOQiKNQ3/qks5km/9dujUGU2ARiU3qmxLMdgegFz8e
-----END RSA PRIVATE KEY-----`;
    }
    generateClientHello() {
        // Random (32 bytes)
        const random = crypto.randomBytes(32);
        
        // Session ID vacío
        const sessionId = Buffer.alloc(32, 0);
        
        // Cipher suites para Android Auto
        const cipherSuites = Buffer.from([
            0x13, 0x02, 0x13, 0x03, 0x13, 0x01, 0xC0, 0x2C,
            0xC0, 0x30, 0x00, 0x9F, 0xCC, 0xA9, 0xCC, 0xA8,
            0xCC, 0xAA, 0xC0, 0x2B, 0xC0, 0x2F, 0x00, 0x9E,
            0xC0, 0x24, 0xC0, 0x28, 0x00, 0x6B, 0xC0, 0x23,
            0xC0, 0x27, 0x00, 0x67, 0xC0, 0x0A, 0xC0, 0x14,
            0x00, 0x39, 0xC0, 0x09, 0xC0, 0x13, 0x00, 0x33,
            0x00, 0x9D, 0x00, 0x9C, 0x00, 0x3D, 0x00, 0x3C,
            0x00, 0x35, 0x00, 0x2F, 0x00, 0xFF
        ]);

        const compressionMethods = Buffer.from([0x01, 0x00]);

        // Extensiones TLS
        const extensions = this.generateExtensions();

        // Construir Client Hello
        const clientHello = Buffer.concat([
            Buffer.from([0x03, 0x03]), // TLS 1.2
            random,
            Buffer.from([0x20]), // session ID length
            sessionId,
            Buffer.from([0x00, 0x3e]), // cipher suites length
            cipherSuites,
            compressionMethods,
            Buffer.from([0x01, 0x00]), // extensions length
            extensions
        ]);

        // Handshake header
        const handshakeHeader = Buffer.concat([
            Buffer.from([0x01]), // Client Hello
            Buffer.from([0x00, 0x01, 0x19]), // length (281)
            clientHello
        ]);

        // TLS Record header
        const recordHeader = Buffer.concat([
            Buffer.from([0x16]), // Handshake
            Buffer.from([0x03, 0x01]), // TLS 1.0
            Buffer.from([0x01, 0x1d]), // length (285)
        ]);

        return Buffer.concat([recordHeader, handshakeHeader]);
    }

    generateExtensions() {
        // Server Name
        const serverName = Buffer.from([
            0x00, 0x00, 0x00, 0x18, 0x00, 0x16, 0x00, 0x00, 0x13,
            0x61, 0x6e, 0x64, 0x72, 0x6f, 0x69, 0x64, 0x2d,
            0x61, 0x75, 0x74, 0x6f, 0x2e, 0x67, 0x6f, 0x6f,
            0x67, 0x6c, 0x65, 0x2e, 0x63, 0x6f, 0x6d
        ]);

        // Extended Master Secret
        const extendedMasterSecret = Buffer.from([0x00, 0x17, 0x00, 0x00]);

        // Supported Groups
        const supportedGroups = Buffer.from([
            0x00, 0x0a, 0x00, 0x0a, 0x00, 0x08,
            0x00, 0x1d, 0x00, 0x17, 0x00, 0x18, 0x00, 0x19
        ]);

        // EC Point Formats
        const ecPointFormats = Buffer.from([0x00, 0x0b, 0x00, 0x02, 0x01, 0x00]);

        // Signature Algorithms
        const signatureAlgorithms = Buffer.from([
            0x00, 0x0d, 0x00, 0x1e, 0x00, 0x1c,
            0x04, 0x03, 0x05, 0x03, 0x06, 0x03, 0x08, 0x07,
            0x08, 0x08, 0x08, 0x09, 0x08, 0x0a, 0x08, 0x0b,
            0x08, 0x04, 0x08, 0x05, 0x08, 0x06, 0x04, 0x01,
            0x05, 0x01, 0x06, 0x01
        ]);

        // Supported Versions
        const supportedVersions = Buffer.from([0x00, 0x2b, 0x00, 0x05, 0x04, 0x03, 0x04, 0x03, 0x03]);

        // PSK Key Exchange Modes
        const pskModes = Buffer.from([0x00, 0x2d, 0x00, 0x02, 0x01, 0x01]);

        // Key Share
        const keyShare = Buffer.from([
            0x00, 0x33, 0x00, 0x26, 0x00, 0x24, 0x00, 0x1d, 0x00, 0x20,
            0x96, 0xa0, 0xf5, 0x54, 0x91, 0xa7, 0xd1, 0x36,
            0x07, 0x3d, 0x0c, 0x6b, 0x95, 0x5d, 0xf9, 0x72,
            0xdd, 0xa8, 0x96, 0xd2, 0x86, 0x65, 0x48, 0xab,
            0x1b, 0x02, 0xac, 0x7f, 0xa3, 0x28, 0x17, 0x6f
        ]);

        return Buffer.concat([
            serverName,
            extendedMasterSecret,
            Buffer.from([0xff, 0x01, 0x00, 0x01, 0x00]), // Renegotiation Info
            supportedGroups,
            ecPointFormats,
            Buffer.from([0x00, 0x23, 0x00, 0x00]), // Session Ticket
            Buffer.from([0x00, 0x10, 0x00, 0x08, 0x00, 0x06, 0x02, 0x68, 0x32, 0x02, 0x68, 0x33]), // ALPN
            signatureAlgorithms,
            supportedVersions,
            pskModes,
            keyShare
        ]);
    }

    createEncapsulatedSSL() {
        const tlsData = this.generateClientHello();
        
        // Header Android Auto
        const aaHeader = Buffer.alloc(6);
        aaHeader.writeUInt16BE(0x0003, 0); // MESSAGE_ENCAPSULATED_SSL
        aaHeader.writeUInt16BE(tlsData.length, 2);
        aaHeader.writeUInt16BE(0x0003, 4);
        
        return Buffer.concat([aaHeader, tlsData]);
    }
    testClient(socket_tcp) {
        const options = {
            host: '192.168.1.128',
            port: 5277,
            rejectUnauthorized: false, // Importante para certificados self-signed
            cert: this.getCrankshaftCertificate(),
            OCSPRequest: true
            
            
        };

        console.log('🔌 Conectando al servidor TLS 5277...');

        const socket = new tls.connect(options, () => {
            console.log('✅ Conectado al servidor TLS');
            console.log('   Cifrado:', socket.getCipher());
            console.log('   Protocolo:', socket.getProtocol());
            console.log('   Autorizado:', socket.authorized);
            
            // Enviar mensaje de prueba
           //socket.write('Hola servidor 5277!');
        });

        socket.on('data', (data) => {
            console.log('📨 Respuesta del servidor:', data.toString());
        });

        socket.on('error', (err) => {
            console.error('❌ Error:', err.message);
        });

        socket.on('close', () => {
            console.log('🔌 Conexión cerrada');
        });

        // Cerrar después de 5 segundos
        setTimeout(() => {
            socket.end();
            process.exit(0);
        }, 5000);
    }
}

// Ejecutar servidor
module.exports = CrankshaftEmulator;
