let dbus = require('dbus-next');
const { Variant } = dbus;
const AgentInterface = dbus.interface.Interface;
const protobuf = require('protobufjs');
const fs = require('fs').promises;
const path = require('path');




// Cargar protobufs
const root = protobuf.loadSync('protos.proto');

// Obtener tipos necesarios
const ControlMessageType = root.lookupEnum('ControlMessageType');
const MessageStatus = root.lookupEnum('MessageStatus');


let Message = dbus.Message;
const { BluetoothSerialPortServer } = require('bluetooth-serial-port');

// UUID oficial de Android Auto Bluetooth Service
const ANDROID_AUTO_UUID = '4de17a00-52cb-11e6-bdf4-0800200c9a66';

class rfcommServer{
    lobby = {};
    constructor(){
        
        this.btServer = new BluetoothSerialPortServer();
        this.CHANNEL = 4
        this.SERVICE_NAME = 'OpenAuto Bluetooth Service';
        this.C_PROTO = new aasdk_protobuf() 
    }
    start(){
        this.btServer.listen((clientAddress, clientSocket)=>{
            console.log(`📲 Cliente conectado: ${clientAddress}`);
            try {

                const versionRequest = this.C_PROTO.encodeVersionRequest();
                
                console.log('🚀 Enviando Version REQUEST inicial...');
                    
                this.btServer.write(versionRequest, (error) => {
                    if (error) {
                        console.log('❌ Error enviando Version Request:', error);
                    } else {
                        console.log('✅ Version REQUEST enviado correctamente');
                        console.log('⏳ Esperando respuesta del móvil...');
                    }
                });
        
            } catch (error) {
                console.error('❌ Error en sendInitialVersionRequest:', error);
            }

            if(!this.lobby[clientAddress]){
                this.lobby[clientAddress] = true
                this.btServer.on('data', (buffer) => {
                    console.log('📨 Datos recibidos del móvil:', buffer.toString('hex'));
                    this.handleIncomingData(buffer);
                });
            }

        }, (error) => {
        if (error) {
            console.error('❌ Error iniciando servidor RFCOMM:', error);
            return;
        }
        console.log('✅ Servidor RFCOMM en escucha');
        }, { uuid: ANDROID_AUTO_UUID, name: this.SERVICE_NAME, channel: this.CHANNEL });
    }
    handleIncomingData(data){
        try {
            console.log('📨 Procesando datos del móvil...');
            
            // Decodificar mensaje AASDK
            const message = this.C_PROTO.decodeAASDKMessage(data);
            
            console.log('🔍 Mensaje decodificado:');
            console.log('  - Tipo:', message.messageType);
            console.log('  - ID:', '0x' + message.messageId.toString(16));
            console.log('  - Tamaño payload:', message.payload.length);
            
            // Según protos.proto, los tipos de mensaje son:
            // MESSAGE_VERSION_REQUEST = 1
            // MESSAGE_VERSION_RESPONSE = 2
            // MESSAGE_ENCAPSULATED_SSL = 3
            // MESSAGE_SERVICE_DISCOVERY_REQUEST = 5
            // etc...
            
            if (message.messageType === 2) { // VERSION_RESPONSE
                console.log('✅ Version Response recibido del móvil!');
                
                // El payload debería ser: [major][minor][status] - 6 bytes
                if (message.payload.length >= 6) {
                    const major = message.payload.readUInt16BE(0);
                    const minor = message.payload.readUInt16BE(2);
                    const status = message.payload.readUInt16BE(4);
                    
                    console.log(`📱 Versión del móvil: ${major}.${minor}`);
                    console.log(`📊 Status: ${status}`);
                    
                    if (status === 0) { // STATUS_SUCCESS
                        console.log('🎉 Handshake de versión exitoso!');
                        console.log('➡️ Continuando con el siguiente paso...');
                    } else {
                        console.log('❌ Error en handshake de versión');
                    }
                }
            }
            else if (message.messageType === 5) { // MESSAGE_SERVICE_DISCOVERY_REQUEST
                console.log('🔍 Service Discovery Request recibido');
                console.log('📦 Payload Service Discovery:', message.payload.toString('hex'));
                
                // Aquí necesitarías enviar un Service Discovery Response
                const serviceDiscoveryResponse = this.C_PROTO.encodeServiceDiscoveryResponse();
                this.btServer.write(serviceDiscoveryResponse, (err)=>{
                    if(err){
                        console.error(new Error(err))
                        console.error(new Error('no se puede enviar serviceDiscoveryResponse'))
                    }else{
                        console.log('envio de serviceDiscoveryResponse')
                    }
                })
                // enviarMensajeAASDK(serviceDiscoveryResponse, 6); // 6 = PingResponse
            }
            else if (message.messageType === 11) { // PingResponse
                /*console.log('🏓 PingRequest recibido');
                // Manejar ping
                const payload = this.send_service_discovery_response();
                console.log(payload.toString('hex'))
                this.btServer.write(payload, (err)=>{
                    if(err){
                        console.error(new Error(err))
                        console.error(new Error('no se puede enviar pingResponse'))
                    }else{
                        console.log('envio de PingResponse y deepseeek apesta')
                    }
                })*/
                    
            }
            else {
                console.log('❓ Tipo de mensaje desconocido:', message.messageType);
                console.log('📦 Payload:', message.payload.toString('hex'));
            }
            
        } catch (error) {
            console.error('❌ Error en handleIncomingData:', error);
        }
    }
    send_service_discovery_response() {
        try {
        console.log('📋 Enviando Service Discovery Response...');
        
        const serviceDiscoveryResponse = this.C_PROTO.encodeServiceDiscoveryResponse();
        
        // ✅ CABECERA AASDK COMPLETA
        const messageType = 6; // MESSAGE_SERVICE_DISCOVERY_RESPONSE
        const messageId = 0x0006;
        const payloadSize = serviceDiscoveryResponse.length;
        
        const header = Buffer.alloc(8);
        header.writeUInt16BE(messageType, 0);
        header.writeUInt16BE(messageId, 2);
        header.writeUInt32BE(payloadSize, 4);
        
        const fullMessage = Buffer.concat([header, serviceDiscoveryResponse]);
        
        console.log(`📤 Service Discovery Response completo: ${fullMessage.toString('hex')}`);
        
        return fullMessage
        
    } catch (error) {
        console.error('❌ Error en sendServiceDiscoveryResponse:', error);
    }
    }
    
    sendPingResponse(pingPayload) {
        try {
            console.log('📤 Enviando PING_RESPONSE...');
            
            const messageType = 12; // MESSAGE_PING_RESPONSE
            const messageId = 0x000c;
            const payloadSize = pingPayload.length;
            
            const header = Buffer.alloc(8);
            header.writeUInt16BE(messageType, 0);
            header.writeUInt16BE(messageId, 2);
            header.writeUInt32BE(payloadSize, 4);
            
            const fullMessage = Buffer.concat([header, pingPayload]);
            
            console.log(`📤 PING_RESPONSE completo: ${fullMessage.toString('hex')}`);
            return fullMessage
            
        } catch (error) {
            console.error('❌ Error en sendPingResponse:', error);
        }
    }
    encodeVersionResponse(){

        try {
            // 1. Verificar que el payload es correcto
            const versionRequest = this.C_PROTO.encodeVersionRequest();
            console.log('🔍 Version Request payload:', versionRequest.toString('hex'));
            
            // 2. El formato debería ser: [channel][messageId][fragInfo][payload]
            const channelId = 0x00;
            const messageId = 0x0001; // VERSION_REQUEST en LITTLE ENDIAN?
            const fragInfo = 0x00;
            
            const header = Buffer.alloc(4);
            header.writeUInt8(channelId, 0);
            header.writeUInt16LE(messageId, 1); // ¡LITTLE ENDIAN!
            header.writeUInt8(fragInfo, 3);
            
            const fullMessage = Buffer.concat([header, versionRequest]);
            
            console.log('🚀 Enviando Version REQUEST con formato Android Auto:');
            console.log('📤 Mensaje completo:', fullMessage.toString('hex'));
            return fullMessage
        
        } catch (error) {
            console.error('❌ Error en sendVersionRequest:', error);
        }
    
    }
    getMessageId(messageType) {
        // Mapear tipos de mensaje a IDs según AASDK
        const messageIds = {
            'VERSION_RESPONSE': 0x0001,
            'AUTH_RESPONSE': 0x0003,
            'SERVICE_DISCOVERY_RESPONSE': 0x0005,
            'CHANNEL_OPEN_RESPONSE': 0x0007,
            'PING_RESPONSE': 0x0009,
            'PING_REQUEST': 0X0001
        };
        
        return messageIds[messageType] || 0x0000;
    }
    createAASDKMessage(messageType, payloadBuffer) {
        try {
            // Header AASDK: [messageId:2 bytes][length:2 bytes]
            const header = Buffer.alloc(4);
            const messageId = this.getMessageId(messageType);
            const length = payloadBuffer.length;
            
            header.writeUInt16LE(messageId, 0);
            header.writeUInt16LE(length, 2);
            
            // Combinar header + payload
            const fullMessage = Buffer.concat([header, payloadBuffer]);
            
            console.log(`📦 Mensaje AASDK creado: tipo=${messageType} (${messageId}), tamaño=${fullMessage.length} bytes`);
            
            return fullMessage;
            
        } catch (error) {
            console.error('❌ Error creando mensaje AASDK:', error);
            throw error;
        }
    }
}


class aasdk_protobuf { 
    constructor() {
        this.root = null;
        this.ServiceDiscoveryResponse = null;
        this.VersionResponse = null;
        this.AuthResponse = null;
        this.protobufBasePath = path.join(__dirname, '');
        this.loadProtobufs()

    }

    async loadProtobufs() {
        try {
            console.log('Cargando protobufs de AASDK...');
            
            const fullPaths = path.join(this.protobufBasePath, 'protos.proto');
            this.root = await protobuf.load(fullPaths);
            
            // CARGAR TODOS LOS TIPOS NECESARIOS
            this.ServiceDiscoveryResponse = this.root.lookupType('ServiceDiscoveryResponse');
            this.Service = this.root.lookupType('Service');
            this.MediaSinkService = this.root.lookupType('MediaSinkService');
            this.InputSourceService = this.root.lookupType('InputSourceService');
            this.SensorSourceService = this.root.lookupType('SensorSourceService');
            this.BluetoothService = this.root.lookupType('BluetoothService');
            this.WifiProjectionService = this.root.lookupType('WifiProjectionService');
            this.AudioConfiguration = this.root.lookupType('AudioConfiguration');
            this.VideoConfiguration = this.root.lookupType('VideoConfiguration');
            this.VersionResponse = this.root.lookupType('VersionResponseOptions');
            this.PingConfiguration = this.root.lookupType('PingConfiguration');
            this.PingRequest = this.root.lookupType('PingRequest')
            this.PingResponse = this.root.lookupType('PingResponse')
            this.ConnectionConfiguration = this.root.lookupType('ConnectionConfiguration');
            
            console.log('✅ Todos los protobufs cargados correctamente');
            return this.root
        } catch (error) {
            console.error('Error cargando protobufs:', error);
            // Puedes crear un fallback básico aquí si es necesario
        }
    }
    getProto(proto){
        return this.root.lookupType(proto);
    }

    encodeVersionRequest() {
        try {
            const major = 6;
            const minor = 1;
            
            const versionBuffer = Buffer.alloc(4);
            versionBuffer.writeUInt16BE(major, 0);  
            versionBuffer.writeUInt16BE(minor, 2);  
            
            console.log(`🔧 Version Request - Major: ${major}, Minor: ${minor}`);
            console.log(`📦 Version binary: ${versionBuffer.toString('hex')}`);
            

            const channelId = 0x00;  
            const messageId = 0x0001; 
            const payloadSize = versionBuffer.length;
            const fragInfo = 0x00;   
            
            const header = Buffer.alloc(5);
            header.writeUInt8(channelId, 0);
            header.writeUInt16LE(messageId, 1);     
            header.writeUInt16LE(payloadSize, 3);   
            
            
            return Buffer.concat([header, versionBuffer]);
        } catch (error) {
            console.error('❌ Error codificando Version Request:', error);
            throw error;
        }
    }

    encodeVersionResponse() {
        try {
            // Según handleVersionResponse en el código C++, Version Response espera:
            // [uint16 major][uint16 minor][uint16 status] - 6 bytes total
            
            const major = 3;   // AASDK_MAJOR
            const minor = 2;   // AASDK_MINOR  
            const status = MessageStatus.values.STATUS_SUCCESS; // 0
            
            const responseBuffer = Buffer.alloc(6);
            responseBuffer.writeUInt16BE(major, 0);     // major
            responseBuffer.writeUInt16BE(minor, 2);     // minor  
            responseBuffer.writeUInt16BE(status, 4);    // status
            
            console.log(`🔧 Version Response - Major: ${major}, Minor: ${minor}, Status: ${status}`);
            console.log(`📦 Response binary: ${responseBuffer.toString('hex')}`);
            
            return responseBuffer;
                
        } catch (error) {
            console.error('❌ Error codificando Version Response:', error);
            throw error;
        }
    }

    decodeAASDKMessage(buffer) {
        try {
            console.log('🔍 Analizando mensaje RAW:', buffer.toString('hex'));
            
            // FORMATO CORRECTO para Android Auto:
            // [channel:1][messageId:2 LE][fragInfo:1][payload]
            
            if (buffer.length >= 4) {
                const channelId = buffer.readUInt8(0);        // 0x00
                const messageId = buffer.readUInt16LE(1);     // 0x0600 = 1536 (LITTLE ENDIAN!)
                const fragInfo = buffer.readUInt8(3);         // 0x08
                const payload = buffer.slice(4);              // f9ffffffffffffff01
                
                console.log('✅ Usando formato Android Auto REAL');
                console.log('  - Channel:', channelId);
                console.log('  - Message ID:', '0x' + messageId.toString(16));
                console.log('  - Frag Info:', fragInfo);
                console.log('  - Payload size:', payload.length, 'bytes');
                
                // Convertir messageId a tipo de mensaje (esto puede variar)
                let messageType;
                if (messageId === 0x0600) messageType = 11; // PING_REQUEST
                // Agrega más mapeos según necesites
                
                return {
                    messageType: messageType || messageId,
                    messageId: messageId,
                    payload: payload,
                    channelId: channelId,
                    fragInfo: fragInfo
                };
            }
            
            // Fallback al formato anterior si no coincide
            const messageType = buffer.readUInt16BE(0);
            const messageId = buffer.readUInt16BE(2);
            const payload = buffer.slice(4); // Solo 4 bytes de header, no 8!
            
            return {
                messageType: messageType,
                messageId: messageId,
                payload: payload,
                payloadSize: payload.length
            };
            
        } catch (error) {
            console.error('❌ Error decodificando mensaje AASDK:', error);
            return {
                messageType: 0,
                messageId: 0, 
                payload: buffer,
                raw: true
            };
        }
    }

    encodePingRequest(){

        const pingResponse = this.PingResponse.create({timestamp: BigInt(Date.now())})
        let buf = this.PingResponse.encode(pingResponse).finish();
        const messageType = 12; // MESSAGE_PING_RESPONSE
        const messageId = 0x000c;
        const payloadSize = buf.length;
        
        const header = Buffer.alloc(8);
        header.writeUInt16BE(messageType, 0);
        header.writeUInt16BE(messageId, 2);
        header.writeUInt32BE(payloadSize, 4);
        
        const fullMessage = Buffer.concat([header, buf]);
        
        return fullMessage
    }

    encodeAuthResponse() {
        try {
            const message = this.AuthResponse.create({
                status: 1
            });

            const buffer = this.AuthResponse.encode(message).finish();
            console.log(`Auth Response codificado: ${buffer.length} bytes`);
            return buffer;
            
        } catch (error) {
            console.error('Error codificando Auth Response:', error);
            throw error;
        }
    }

    encodeServiceDiscoveryResponse() {
        try {
            // Verificar que los tipos estén cargados
            if (!this.ServiceDiscoveryResponse || !this.Service || !this.MediaSinkService || 
                !this.InputSourceService || !this.SensorSourceService || !this.BluetoothService ||
                !this.WifiProjectionService || !this.AudioConfiguration || !this.VideoConfiguration) {
                throw new Error('Tipos protobuf no cargados. Llama a loadProtobufs() primero.');
            }

            // 1. Configuración de audio para diferentes canales
            const audioConfigMedia = this.AudioConfiguration.create({
                sampling_rate: 48000,
                number_of_bits: 16,
                number_of_channels: 2
            });

            const audioConfigSpeech = this.AudioConfiguration.create({
                sampling_rate: 16000,
                number_of_bits: 16,
                number_of_channels: 1
            });

            const audioConfigSystem = this.AudioConfiguration.create({
                sampling_rate: 16000,
                number_of_bits: 16,
                number_of_channels: 1
            });

            // 2. Configuración de video
            const videoConfig = this.VideoConfiguration.create({
                codec_resolution: 'VIDEO_800x480',  // 800x480
                frame_rate: 'VIDEO_FPS_60',         // 60 FPS
                width_margin: 0,
                height_margin: 0,
                density: 140,
                video_codec_type: 'MEDIA_CODEC_VIDEO_H264_BP'
            });

            // 3. Servicios individuales
            const mediaSinkService = this.MediaSinkService.create({
                available_type: 'MEDIA_CODEC_AUDIO_PCM',
                audio_type: 'AUDIO_STREAM_MEDIA',
                audio_configs: [audioConfigMedia],
                video_configs: [videoConfig],
                available_while_in_call: true
            });

            const inputSourceService = this.InputSourceService.create({
                touchscreen: [{
                    width: 800,
                    height: 480
                }]
            });

            const sensorSourceService = this.SensorSourceService.create({
                sensors: [
                    { sensor_type: 'SENSOR_DRIVING_STATUS_DATA' },
                    { sensor_type: 'SENSOR_LOCATION' },
                    { sensor_type: 'SENSOR_NIGHT_MODE' }
                ]
            });

            const bluetoothService = this.BluetoothService.create({
                car_address: "",  // Dejar vacío para que use la dirección actual
                supported_pairing_methods: ['BLUETOOTH_PAIRING_PIN']
            });

            const wifiProjectionService = this.WifiProjectionService.create({
                car_wifi_bssid: ""  // Se configurará más tarde
            });

            // 4. Crear los servicios (channels)
            const services = [
                // Channel 1 - Input
                this.Service.create({
                    id: 1,
                    input_source_service: inputSourceService
                }),
                // Channel 2 - Sensores
                this.Service.create({
                    id: 2,
                    sensor_source_service: sensorSourceService
                }),
                // Channel 3 - Video
                this.Service.create({
                    id: 3,
                    media_sink_service: this.MediaSinkService.create({
                        available_type: 'MEDIA_CODEC_VIDEO_H264_BP',
                        video_configs: [videoConfig],
                        available_while_in_call: true
                    })
                }),
                // Channel 4 - Audio Media
                this.Service.create({
                    id: 4,
                    media_sink_service: this.MediaSinkService.create({
                        available_type: 'MEDIA_CODEC_AUDIO_PCM',
                        audio_type: 'AUDIO_STREAM_MEDIA',
                        audio_configs: [audioConfigMedia],
                        available_while_in_call: true
                    })
                }),
                // Channel 5 - Audio Speech
                this.Service.create({
                    id: 5,
                    media_sink_service: this.MediaSinkService.create({
                        available_type: 'MEDIA_CODEC_AUDIO_PCM',
                        audio_type: 'AUDIO_STREAM_TELEPHONY',
                        audio_configs: [audioConfigSpeech],
                        available_while_in_call: true
                    })
                }),
                // Channel 6 - Audio System
                this.Service.create({
                    id: 6,
                    media_sink_service: this.MediaSinkService.create({
                        available_type: 'MEDIA_CODEC_AUDIO_PCM',
                        audio_type: 'AUDIO_STREAM_SYSTEM_AUDIO',
                        audio_configs: [audioConfigSystem],
                        available_while_in_call: true
                    })
                }),
                // Channel 7 - Bluetooth
                this.Service.create({
                    id: 7,
                    bluetooth_service: bluetoothService
                }),
                // Channel 8 - WiFi Projection
                this.Service.create({
                    id: 8,
                    wifi_projection_service: wifiProjectionService
                })
            ];

            // 5. HeadUnit Info (similar a crankshaft-ng)
            const headUnitInfo = {
                make: 'OpenAuto',
                model: 'Linux PC',
                year: '2024',
                vehicle_id: this.generateVehicleId(),
                head_unit_make: 'OpenAuto',
                head_unit_model: 'Node.js Implementation',
                head_unit_software_build: '1.0.0',
                head_unit_software_version: '1.0'
            };

            // 6. Ping Configuration
            const pingConfiguration = this.PingConfiguration.create({
                timeout_ms: 3000,
                interval_ms: 1000,
                high_latency_threshold_ms: 200,
                tracked_ping_count: 5
            });

            const connectionConfiguration = this.ConnectionConfiguration.create({
                ping_configuration: pingConfiguration
            });

            // 7. Service Discovery Response final
            const serviceDiscoveryResponse = this.ServiceDiscoveryResponse.create({
                services: services,
                driver_position: 'DRIVER_POSITION_LEFT',
                display_name: 'OpenAuto Linux',
                probe_for_support: false,
                connection_configuration: connectionConfiguration,
                headunit_info: headUnitInfo,
                can_play_native_media_during_vr: false
            });

            // Verificar y codificar
            const errMsg = this.ServiceDiscoveryResponse.verify(serviceDiscoveryResponse);
            if (errMsg) {
                console.warn('Advertencia en verificación:', errMsg);
            }

            const buffer = this.ServiceDiscoveryResponse.encode(serviceDiscoveryResponse).finish();
            
            console.log(`✅ Service Discovery Response codificado: ${buffer.length} bytes`);
            console.log('📋 Servicios incluidos:');
            console.log('   - Channel 1: Input (Touchscreen)');
            console.log('   - Channel 2: Sensores');
            console.log('   - Channel 3: Video (800x480@60fps)');
            console.log('   - Channel 4: Audio Media (48kHz stereo)');
            console.log('   - Channel 5: Audio Speech (16kHz mono)');
            console.log('   - Channel 6: Audio System (16kHz mono)');
            console.log('   - Channel 7: Bluetooth');
            console.log('   - Channel 8: WiFi Projection');
            
            return buffer;
            
        } catch (error) {
            console.error('❌ Error codificando Service Discovery Response:', error);
            throw error;
        }
    }

    createAASDKMessage(messageType, payloadBuffer) {
        try {
            const header = Buffer.alloc(4);
            const messageId = this.getMessageId(messageType);
            const length = payloadBuffer.length;
            
            header.writeUInt16LE(messageId, 0);
            header.writeUInt16LE(length, 2);
            
            const fullMessage = Buffer.concat([header, payloadBuffer]);
            
            console.log(`Mensaje AASDK creado: tipo=${messageType} (${messageId}), tamaño=${fullMessage.length} bytes`);
            
            return fullMessage;
            
        } catch (error) {
            console.error('Error creando mensaje AASDK:', error);
            throw error;
        }
    }

    getMessageId(messageType) {
        const messageIds = {
            'VERSION_RESPONSE': 0x0001,
            'AUTH_RESPONSE': 0x0003,
            'SERVICE_DISCOVERY_RESPONSE': 0x000b,
            'CHANNEL_OPEN_RESPONSE': 0x0007,
            'PING_RESPONSE': 0x0009
        };
        
        return messageIds[messageType] || 0x0000;
    }

    generateVehicleId() {
        return `CRANKSHAFT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    }
}

class BluetoothAgent extends AgentInterface {
  constructor(rl) {
    super('org.bluez.Agent1');
    this.rl = rl;
  }

  Release() {
    console.log('[Agent] Liberado');
  }

  RequestPinCode(device) {
    console.log(`[Agent] Solicitado PIN para dispositivo: ${device}`);
    return '1234'; // PIN por defecto
  }

  DisplayPinCode(device, pincode) {
    console.log(`[Agent] Mostrar PIN ${pincode} para dispositivo: ${device}`);
  }

  RequestPasskey(device) {
    console.log(`[Agent] Solicitada passkey para dispositivo: ${device}`);
    const passkey = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    console.log(`[Agent] Passkey generada: ${passkey}`);
    return parseInt(passkey);
  }

  DisplayPasskey(device, passkey, entered) {
    console.log(`\n🎯 [NUMERIC COMPARISON]`);
    console.log(`📱 Dispositivo: ${device}`);
    console.log(`🔢 Número en pantalla: ${passkey}`);
    console.log(`📊 Dígitos ingresados: ${entered}`);
    console.log('✅ Confirma en tu móvil que los números coinciden\n');
  }

  RequestConfirmation(device, passkey) {
    console.log(`\n🎯 [CONFIRMACIÓN REQUERIDA]`);
    console.log(`📱 Dispositivo: ${device}`);
    console.log(`🔢 Número a confirmar: ${passkey}`);
    
    return new Promise((resolve, reject) => {
      this.rl.question('¿Confirmar pairing? (s/n): ', (answer) => {
        if (answer.toLowerCase() === 's') {
          console.log('✅ Pairing confirmado');
          resolve();
        } else {
          console.log('❌ Pairing rechazado');
          reject(new Error('Pairing rechazado por el usuario'));
        }
      });
    });
  }

  RequestAuthorization(device) {
    console.log(`[Agent] Solicitada autorización para: ${device}`);
    return new Promise((resolve, reject) => {
      this.rl.question(`¿Autorizar dispositivo ${device}? (s/n): `, (answer) => {
        if (answer.toLowerCase() === 's') {
          resolve();
        } else {
          reject(new Error('Autorización rechazada'));
        }
      });
    });
  }

  AuthorizeService(device, uuid) {
    console.log(`[Agent] Autorizar servicio ${uuid} para: ${device}`);
    return; // Autorizar todos los servicios
  }

  Cancel() {
    console.log('[Agent] Operación cancelada');
  }
}

// Configurar las firmas de los métodos del Agent
BluetoothAgent.configureMembers({
  methods: {
    Release: {},
    RequestPinCode: { inSignature: 'o', outSignature: 's' },
    DisplayPinCode: { inSignature: 'os' },
    RequestPasskey: { inSignature: 'o', outSignature: 'u' },
    DisplayPasskey: { inSignature: 'ouq' },
    RequestConfirmation: { inSignature: 'ou' },
    RequestAuthorization: { inSignature: 'o' },
    AuthorizeService: { inSignature: 'os' },
    Cancel: {}
  }
});
async function setupAgent(bus) {
    try {
      const agentPath = '/my/bluetooth/agent';
      
      // Crear instancia del Agent
      const agent = new BluetoothAgent();

      // Exportar el agent CORRECTAMENTE
      bus.export(agentPath, agent);
      console.log('✅ Agent exportado correctamente');

      // Registrar el agent con BlueZ
      const agentManagerObject = await bus.getProxyObject('org.bluez', '/org/bluez');
      const agentManager = agentManagerObject.getInterface('org.bluez.AgentManager1');
      
      await agentManager.RegisterAgent(agentPath, 'NoInputNoOutput');
      console.log('✅ Agent registrado como NoInputNoOutput');

      await agentManager.RequestDefaultAgent(agentPath);
      console.log('✅ Agent configurado como predeterminado');

    } catch (error) {
      console.error('❌ Error configurando agent:', error);
    }
}
    const rfcomm = new rfcommServer()
    rfcomm.start()
async function handleNewDevice(devicePath, deviceProps, bus) {
    const address = deviceProps.Address.value;
    const name = deviceProps.Name ? deviceProps.Name.value : 'Unknown';
    const paired = deviceProps.Paired ? deviceProps.Paired.value : false;


    if(!~name.indexOf('Redmi Note 12')){
        //empieza hacer pairing.
        return 
    }
    console.log(`Nuevo dispositivo: ${name} (${address})`);
    console.log(`Estado: ${paired ? 'Ya emparejado' : 'Necesita pairing'}`);
    let is_paired = paired
    if(!paired){
        is_paired = await initiatePairing(devicePath, address, name)
    }
    if(!is_paired){
        console.error(new Error(name, 'no se puede emparejar.'))
        return
    }
    console.log('esta emparejado sigue para alante como los de alicante', is_paired)
      // Iniciar servidor RFCOMM tipo OpenAuto


}
async function initiatePairing(devicePath, address, name) {
    try {
        console.log(`Iniciando pairing con: ${name} (${address})`);
        
        const bus = dbus.systemBus();
        const deviceObject = await bus.getProxyObject('org.bluez', devicePath);
        const device = deviceObject.getInterface('org.bluez.Device1');

        const deviceProps = deviceObject.getInterface('org.freedesktop.DBus.Properties');
        setupAgent(bus)
        deviceProps.on('PropertiesChanged', (interfaceName, changedProps, invalidatedProps) => {
            if (changedProps.Paired !== undefined) {
                console.log(`Estado de pairing cambiado: `, changedProps.Paired);
            }
        });

        await device.Pair();
        console.log(`Pairing completado con: ${name}`);
        return Promise.resolve(true)

    } catch (error) {
        console.error(new Error(error.stack))
        console.error(new Error(error))
        console.error(`Error en pairing con ${address}:`);
        return Promise.resolve(false)
    }
}
(async()=>{

    const wifiConfig = {
        ssid: 'MIWIFI_2G_2uty',
        password: 'mrGiGEAu'
    };
    const bus = dbus.systemBus();
    const adapterObject = await bus.getProxyObject('org.bluez', '/org/bluez/hci0');
    const adapterProps = adapterObject.getInterface('org.freedesktop.DBus.Properties');
    await adapterProps.Set('org.bluez.Adapter1', 'Powered', new Variant('b', true));
    await adapterProps.Set('org.bluez.Adapter1', 'Discoverable', new Variant('b', true));
    await adapterProps.Set('org.bluez.Adapter1', 'Pairable', new Variant('b', true));
    const adapterAddress = (await adapterProps.Get('org.bluez.Adapter1', 'Address')).value;

    console.log('BluetoothService inicializado');
    console.log(`Dirección del adaptador: ${adapterAddress}`);
    const objectManager = await bus.getProxyObject('org.bluez', '/').catch(error => {
        console.error('Error configurando pairing handler:', error);
    });

    const objectManagerInterface = objectManager.getInterface('org.freedesktop.DBus.ObjectManager');
    // add a custom handler for a particular method
    bus.addMethodHandler((msg) => {
        console.log('message: ', msg)
        if (msg.path === '/org/test/path' &&
            msg.interface === 'org.test.interface'
            && msg.member === 'SomeMethod') {
            // handle the method by sending a reply
            let someMethodReply = Message.newMethodReturn(msg, 's', ['hello']);
            bus.send(someMethodReply);
            return true;
        }
    });
    
    objectManagerInterface.on('InterfacesAdded', (path, interfaces) => {
        if (interfaces['org.bluez.Device1']) {
            handleNewDevice(path, interfaces['org.bluez.Device1'], bus);
        }
    });

    objectManagerInterface.on('InterfacesRemoved', (path, interfaces) => {
        if (interfaces.includes('org.bluez.Device1')) {
            this.handleDeviceRemoved(path);
        }
    });
})()
