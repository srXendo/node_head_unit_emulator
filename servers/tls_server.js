// tls-custom-client.js
const tls = require('tls');
const fs = require('fs');
const aasdk_protobuf = require('../helpers/aasdk_protobuf');
module.exports = class tls_server{

    constructor(channel_open_request_callback){
        this.is_bindingkeys = false
        this.is_sending = false
        this.pending = [] 
        this.socket;
        this.channel_open_request_callback = channel_open_request_callback
        this.start()
        this.aa_protos = new aasdk_protobuf()
        this.aa_protos.loadProtobufs()
    }
    async start(){
        console.log('tls_server on')
        const HOST = 'CARNETWORK'; // <— cámbialo
        const PORT = 5000;          // <— cámbialo

        const options = {

            host: HOST,
            port: PORT,

            rejectUnauthorized: false,  // Temporalmente para debugging


            // Certificados (si necesitas autenticación mutua)
            key: fs.readFileSync('./priv.pem'),
            cert: fs.readFileSync('./cert.pem'),
        }

        // Conexión TLS
        this.socket = tls.connect(options, () => {
            console.log('🔗 Handshake TLS completado');
            console.log('Versión negociada:', this.socket.getProtocol());
            console.log('Cipher suite:', this.socket.getCipher());
            console.log('Certificado CN:', this.socket.getPeerCertificate().subject.CN);
            console.log('Emitido por:', this.socket.getPeerCertificate().issuer.CN);

        // Envía algo de prueba si el protocolo del vehículo lo requiere
        });

        //console.log('proto decodificado: ', this.aa_protos.encodeServiceDiscoveryResponse(), this.aa_protos.root.lookupType('ServiceDiscoveryResponse').decode(this.aa_protos.encodeServiceDiscoveryResponse()))
        this.socket.on('data', (data) => {
            this.handlerMessage(data)
        })
        this.socket.on('error', (err)=>{
            console.error(new Error(err))
            console.error(new Error(err.stack))
            throw new Error(err)
        })
    }
    async handlerMessage(data){
        try{
            console.log('datos recibidos: ', data)
            let headers = Buffer.alloc(4)
            let id_service = data.readUInt8(data.length - 1)
            let skip = false
            switch(data.readUInt16BE(0)){
                case 32769:
                    console.log('start channel: <-------', data)
                    this.channel_open_request_callback({
                        id_service: id_service,
                        flag_service: 0x0b
                    })

                    this.enqueue(Buffer.from('80030800','hex'))
                    if(id_service === 3){
                        console.log('send video focus request: ')
                        this.channel_open_request_callback({
                            id_service: 0x03,
                            flag_service: 0x0b
                        })
                        
                        this.enqueue(Buffer.from('8003080210011800','hex'))
                        this.enqueue(Buffer.from('800808011000 ', 'hex'))
                    }
                    skip = true;
                    break;
                case 32768:
                    this.channel_open_request_callback({
                        id_service: id_service,
                        flag_service: 0x0b
                    })
                    this.enqueue(Buffer.from('00080800', 'hex'))
                    skip = true
                    console.log('open channel: ')
                    break;
                case 32770:
                    this.channel_open_request_callback({
                        id_service: id_service,
                        flag_service: 0x0b
                    })
                    this.enqueue(Buffer.from('80036a020800','hex'))
                    skip = true
                    break;
                case 32771:
                    this.channel_open_request_callback({
                        id_service: id_service,
                        flag_service: 0x0b
                    })
                    this.enqueue(Buffer.from('80030800', 'hex'))
                    skip = true
                    break;
                case 11:
                    this.channel_open_request_callback({
                        id_service: id_service,
                        flag_service: 0x0b
                    })
                    this.enqueue(Buffer.from('800352020800', 'hex'))
                    skip = true
                    break;

                case 1:
                    console.log('on media ')
                    this.channel_open_request_callback({
                        id_service: id_service,
                        flag_service: 0x0b
                    })
                    this.enqueue(Buffer.from('800408001001', 'hex'))
                    skip = true
                    break;
            }
            if(!skip){
                switch(data.readUInt8(1)){
                    case 0x05:
                        console.log('recive tls discovery Request: ', JSON.stringify(this.aa_protos.ServiceDiscoveryResponse.decode(Buffer.from('0a1408041a10080110031a080880f7021010180228010a1308051a0f080110011a0708807d1010180128010a1308061a0f080110021a0708807d1010180128010a1508031a110803220b0803100118002000288c0128010a0f08092a0b0801120708807d101018010a100801120c0a02080d0a0208010a02080a0a0c08082208120608800f10b8080a12080a320e0a00120affffffffffffffffff0130015800720d4372616e6b73686166742d4e47780082010d0a0b08b81710e80718c80120058a01530a0a4372616e6b73686166741209556e6976657273616c1a04323031382210323032343131303832323135303938382a0366317832154372616e6b73686166742d4e47204175746f6170703a01314203312e30', 'hex'))))
                        
                        this.enqueue(Buffer.concat([Buffer.from('0006','hex'), this.aa_protos.encodeServiceDiscoveryResponse()]))

                        break;
                    case 0x07:
                        headers = Buffer.alloc(2)
                        headers.writeUInt16BE(8, 0)
                        
                        id_service = data.readUInt8(data.length - 1)
                        let priority = data.readUInt8(data.length - 3)
                        

                        console.log(`recive  open request: id_service: ${id_service}, priority: ${priority}`)
                        

                        console.log(Buffer.from("00080800", "hex"))
                        this.channel_open_request_callback({
                            id_service: id_service,
                            flag_service: 0x0f 
                        })
                        this.enqueue(Buffer.from("00080800", "hex"))
                        break;
                    case 18:
                        headers = Buffer.alloc(2)
                        headers.writeUint16BE(19, 0)

                        console.log('recive voice session focus')
                        const AudioFocusNotification = this.aa_protos.AudioFocusNotification.fromObject({
                            focusState: 3
                        })
                        console.log("-->",Buffer.concat([headers, this.aa_protos.AudioFocusNotification.encode(AudioFocusNotification).finish()]))
                        this.socket.write(Buffer.concat([headers, this.aa_protos.AudioFocusNotification.encode(AudioFocusNotification).finish()]))
                        break;                 
                    default:
                        console.log(data.toString('hex'))
                        console.error(new Error('mensaje tls no reconocido: '))
                        break;
                        
                }
            }

        }catch(err){
            console.error(new Error(err))
        }     
    }
    enqueue(send_buffer){
        this.pending.push(send_buffer)
        this.send_enqueue()

    }
    send_enqueue(){
        if(this.pending.length > 0 && !this.is_sending){
            this.is_sending = true
            this.socket.write(this.pending[0], ()=>{
                this.pending = this.pending.slice(1)
                this.is_sending = false
                this.send_enqueue()
                
            })
        }
    }
}