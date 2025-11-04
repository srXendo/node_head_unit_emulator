const { BluetoothSerialPortServer } = require('bluetooth-serial-port');
const aasdk_protobuf = require('./../helpers/aasdk_protobuf')
const ANDROID_AUTO_UUID = '4de17a00-52cb-11e6-bdf4-0800200c9a66';
const wifiConfig = {
    ssid: 'MIWIFI_5G_2uty',
    password: 'mrGiGEAu',
    bssid: 'e4:ca:12:d4:1d:dd'
};
module.exports = class rfcommServer {
    constructor() {
        this.btServer = new BluetoothSerialPortServer();
        this.CHANNEL = 3;
        this.SERVICE_NAME = 'Android Auto';
        this.C_PROTO = new aasdk_protobuf();
        this.C_PROTO.loadProtobufs()
        this.connectedClients = new Map();
    }
    start() {
        this.btServer.listen((clientAddress, clientSocket) => {
            console.log(`📲 Cliente conectado: ${clientAddress}`);
            
            if (!this.connectedClients.has(clientAddress)) {
                this.connectedClients.set(clientAddress, true);
                
                // Configurar handler de datos para este cliente
                this.btServer.on('data', (buffer) => {
                    this.handleIncomingData(buffer, clientAddress);
                });
                //


                
                this.sendWifiStartRequest() 
                this.sendCredentials()


            }else{
                this.sendPairingResponse();
            }

        }, (error) => {
            if (error) {
                console.error('❌ Error iniciando servidor RFCOMM:', error);
                return;
            }
            console.log('✅ Servidor RFCOMM en escucha');
        }, { 
            uuid: ANDROID_AUTO_UUID, 
            name: this.SERVICE_NAME, 
            channel: this.CHANNEL 
        });
    }

    handleIncomingData(data) {
        try {
            console.log('\n📨 Datos procesando:', data.toString('hex'));
            const messages = this.decodeAASDKMessage(data);
            console.log(`📨 messages recibidos: ${messages.length}`, messages)
            for(let message of messages){
                switch(message.id){
                    case 2:
                        setTimeout(()=>{
                                            
                        }, 3000)
                    break;
                    case 6:
                        console.log(this.C_PROTO.root.lookupType('UserSwitchResponse').decode(message.payload))

                            //this.sendPairingResponse()


                    break;
                    case 7:
                        //this.sendPairingResponse()
                        setTimeout(()=>{
                            //this.sendPairingResponse()
                        }, 3000)
                    break;
                    default: 
                        console.error(new Error(`❌ id: ${message.id} no reconocido`))
                        break;
                }
            }
            
        } catch (error) {
            console.error('❌ Error en handleIncomingData:', error);
        }
    }
    sendUserSwitch(){
        const UserSwitchResponse = this.C_PROTO.UserSwitchResponse.create({
            status: 0,
            selected_device: {
                device_name: this.clientAddress
            }
        })
        const payload = this.C_PROTO.UserSwitchResponse.encode(UserSwitchResponse).finish()
        const header = Buffer.alloc(4);
        header.writeUInt16BE(payload.length, 0);  // length
        header.writeUInt16BE(6, 2);          // message type
        const fullMessage = Buffer.concat([header, payload]);
        this.btServer.write(fullMessage, (error) => {
            if (error) {
                console.log('❌ Error enviando sendUserSwitch:', error);
            } else {
                console.log('✅ sendUserSwitch enviado');
            }
        });
    }
    sendPairingResponse(){
        const BluetoothPairingResponse = this.C_PROTO.BluetoothPairingResponse.create({
            status: 0,
            alreadyPaired: true
        })
        const payload = this.C_PROTO.BluetoothPairingResponse.encode(BluetoothPairingResponse).finish()
        const header = Buffer.alloc(4);
        header.writeUInt16BE(payload.length, 0);  // length
        header.writeUInt16BE(6, 2);          // message type
        const fullMessage = Buffer.concat([header, payload]);
        this.btServer.write(fullMessage, (error) => {
            if (error) {
                console.log('❌ Error enviando BluetoothPairingResponse:', error);
            } else {
                console.log('✅ BluetoothPairingResponse enviado');
            }
        });
    }
    sendChannelOpenResponse(){
        const response = Buffer.from([
            0x00, 0x00,  // length: 0
            0x00, 0x08   // ID: 8 (MESSAGE_CHANNEL_OPEN_RESPONSE)
        ]);
        
        console.log('✅ Enviando sendChannelOpenResponse:', response.toString('hex'));
        this.btServer.write(response,(error) => {
            if (error) {
                console.log('❌ Error enviando sendChannelOpenResponse:', error);
            } else {
                console.log('✅ sendChannelOpenResponse enviado');
            }
        });
    }

    sendWifiStartRequest(){
        try {

            const ip = "192.168.1.131";
            const port = 0x8827; // 0x8827
            //001200010a0d3139322e3136382e3235342e31108827ef
            //001200010a0d3139322e3136382e312e313238108827
           // Codificar manualmente (NO usa protobufs)
            const ipBuffer = Buffer.from(ip, 'utf8');
            const portBuffer = Buffer.alloc(3);
            portBuffer.writeUInt8(0x10, 0);  // tag
            portBuffer.writeUInt16BE(port, 1); // value
            
            // Construir mensaje completo
            const payload = Buffer.concat([
                Buffer.from([0x0a, ipBuffer.length]), // tag + length
                ipBuffer,                             // IP string
                portBuffer                            // port
            ]);
            
            const header = Buffer.alloc(4);
            header.writeUInt16BE(payload.length, 0);  // length
            header.writeUInt16BE(0x0001, 2);          // message type
            
            const fullMessage = Buffer.concat([header, payload]);
            console.log('📡 Enviando WiFi Handshake:', fullMessage.toString('hex'));
            this.btServer.write(fullMessage,(error) => {
                if (error) {
                    console.log('❌ Error enviando sendWifiVersionRequest:', error);
                } else {
                    console.log('✅ sendWifiVersionRequest enviado');
                }
            });
            
        } catch (error) {
            console.error('❌ Error en sendWifiVersionRequest:', error);
        }
    }
    sendCredentials(){
        try {
            const name = wifiConfig.ssid;
            const password = wifiConfig.password;
            const mac = wifiConfig.bssid;
            
            const nameBuffer = Buffer.from(name, 'utf8');
            const passBuffer = Buffer.from(password, 'utf8'); 
            const macBuffer = Buffer.from(mac, 'utf8');
            
            const payload = Buffer.concat([
                Buffer.from([0x0a, nameBuffer.length]), nameBuffer,    // name
                Buffer.from([0x12, passBuffer.length]), passBuffer,    // password
                Buffer.from([0x1a, macBuffer.length]), macBuffer,      // mac
                Buffer.from([0x20, 0x08, 0x28, 0x00])                 // flags
            ]);
            
            const header = Buffer.alloc(4);
            header.writeUInt16BE(payload.length, 0);   // length
            header.writeUInt16BE(0x0003, 2);           // message type
            const final_buffer = Buffer.concat([header, payload])
            console.log('sendCredentials: ', final_buffer.toString('hex'))
            //003200030a0d4352414e4b53484146542d4e47120a313233343536373839301a1142383a32373a45423a33343a35393a304520082800
            //003200030a0d4352414e4b53484146542d4e47120a313233343536373839301a1142383a32373a45423a33343a35393a304520082800
            this.btServer.write(final_buffer,(error) => {
                if (error) {
                    console.log('❌ Error enviando wifi start request:', error);
                } else {
                    console.log('✅ wifi start request enviado');
                }
            });
            
        } catch (error) {
            console.error('❌ Error en wifi start request:', error);
        }
    }
    handleServiceDiscoveryRequest() {
        
        // Crear ChannelOpenResponse con status = 0 (SUCCESS)
        const responsePayload = Buffer.from([0x08, 0x00]); // field 1, varint 0
        
        const header = Buffer.alloc(4);
        header.writeUInt16BE(responsePayload.length, 0); // length = 2
        header.writeUInt16BE(8, 2); // message ID = 8 (ChannelOpenResponse)
        console.log()
        const fullMessage = Buffer.concat([header, responsePayload]);
        this.btServer.write(fullMessage,(error) => {
            if (error) {
                console.log('❌ Error handleServiceDiscoveryRequest:', error);
            } else {
                console.log('✅ handleServiceDiscoveryRequest enviado', fullMessage.toString('hex'));
            }
        });
        
    }
   
    decodeAASDKMessage(buffer) {
        try{
            const payloadLength = buffer.readUint16LE(1)
            const id = buffer.readUint8(3)
            const payload = buffer.slice(4, payloadLength+4)
            const row = buffer.slice(0, payloadLength+4)
            if(payloadLength < buffer.length - 8){
                return [{row, payloadLength, id, payload}, ...this.decodeAASDKMessage(buffer.slice(payloadLength+4, buffer.length))]
            }else{
                return [{row, payloadLength, id, payload}]
            }
        }catch(err){
            console.error(new Error(err))
            console.error(new Error(err.stack))
            return []
        }
    }
}