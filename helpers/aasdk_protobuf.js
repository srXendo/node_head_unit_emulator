const protobuf = require('protobufjs');
const wifiConfig = {
    ssid: 'MIWIFI_5G_2uty',
    password: 'mrGiGEAu',
    bssid: 'e4:ca:12:d4:1d:dd'
};
module.exports = class aasdk_protobuf {
    constructor() {
        this.root = null;
    }

    async loadProtobufs() {
        try {
            console.log('Cargando protobufs de AASDK...');
            
            this.root = await protobuf.load('protos.proto');
            // Cargar tipos esenciales
            this.UserSwitchResponse = this.root.lookupType('UserSwitchResponse')
            this.BluetoothPairingRequest = this.root.lookupType('BluetoothPairingRequest')
            this.NavFocusRequestNotification = this.root.lookupType('NavFocusRequestNotification')
            this.VideoConfigs = this.root.lookupType('VideoConfiguration')
            this.AudioConfigs = this.root.lookupType('AudioConfiguration')
            this.ChannelOpenRequest = this.root.lookupType('ChannelOpenRequest')
            this.ChannelOpenResponse = this.root.lookupType('ChannelOpenResponse')
            this.VoiceSessionNotification = this.root.lookupType('VoiceSessionNotification')
            this.WifiVersionRequest = this.root.lookupType('WifiVersionRequest')
            this.WifiStartRequest = this.root.lookupType('WifiStartRequest')
            this.MediaSourceService = this.root.lookupType('MediaSourceService')
            this.NavigationStatusService = this.root.lookupType('NavigationStatusService')
            this.HeadUnitInfo = this.root.lookupType('HeadUnitInfo')  
            this.WirelessTcpConfiguration = this.root.lookupType('WirelessTcpConfiguration')  
            this.MediaPlaybackStatusService = this.root.lookupType('MediaPlaybackStatusService')  
            this.PhoneStatusService = this.root.lookupType('PhoneStatusService')
            this.WifiCredentialsResponse = this.root.lookupType('WifiCredentialsResponse')
            this.ServiceDiscoveryResponse = this.root.lookupType('ServiceDiscoveryResponse');
            this.Service = this.root.lookupType('Service');
            this.MediaSinkService = this.root.lookupType('MediaSinkService');
            this.InputSourceService = this.root.lookupType('InputSourceService');
            this.SensorSourceService = this.root.lookupType('SensorSourceService');
            this.BluetoothPairingResponse = this.root.lookupType('BluetoothPairingResponse')
            this.BluetoothService = this.root.lookupType('BluetoothService');
            this.VersionResponseOptions = this.root.lookupType('VersionResponseOptions');
            this.ConnectionConfiguration = this.root.lookupType('ConnectionConfiguration');
            this.PingConfiguration = this.root.lookupType('PingConfiguration');
            this.PingRequest = this.root.lookupType('PingRequest');
            this.PingResponse = this.root.lookupType('PingResponse');
            this.AuthResponse = this.root.lookupType('AuthResponse');
            this.AudioFocusNotification = this.root.lookupType('AudioFocusNotification')
            this.WifiProjectionService = this.root.lookupType('WifiProjectionService')
            console.log('✅ Protobufs cargados correctamente', this.WifiProjectionService.create);
        } catch (error) {
            console.error('Error cargando protobufs:', error);
        }
    }

    encodeVersionRequest() {
        try {
            // Versión según GalConstants: PROTOCOL_MAJOR_VERSION = 1, PROTOCOL_MINOR_VERSION = 6
            const major = 1;
            const minor = 6;
            
            const versionBuffer = Buffer.alloc(4);
            versionBuffer.writeUInt16BE(major, 0);
            versionBuffer.writeUInt16BE(minor, 2);
            
            console.log(`🔧 Version Request - Major: ${major}, Minor: ${minor}`);
            
            return versionBuffer;
        } catch (error) {
            console.error('❌ Error codificando Version Request:', error);
            throw error;
        }
    }


    encodeVersionResponse() {
        try {
            // Versión que debería ser compatible con Android Auto
            const major = 1;
            const minor = 6;
            const status = 0; // STATUS_SUCCESS
            
            const responseBuffer = Buffer.alloc(6);
            responseBuffer.writeUInt16BE(major, 0);
            responseBuffer.writeUInt16BE(minor, 2);
            responseBuffer.writeUInt16BE(status, 4);
            
            console.log(`🔧 Version Response - Major: ${major}, Minor: ${minor}, Status: ${status}`);
            
            return responseBuffer;
        } catch (error) {
            console.error('❌ Error codificando Version Response:', error);
            throw error;
        }
    }
    encodeServiceDiscoveryResponse() {
        const serviceDiscoveryResponse = {
            services: [
                {
                    id: 4,
                    mediaSinkService: {
                        availableType: 1, // MEDIA_CODEC_AUDIO_PCM = 1
                        audioType: 3,     // AUDIO_STREAM_MEDIA = 3
                        audioConfigs: [{
                            samplingRate: 48000,
                            numberOfBits: 16,
                            numberOfChannels: 2
                        }],
                        availableWhileInCall: true
                    }
                },
                {
                    id: 5,
                    mediaSinkService: {
                        availableType: 1, // MEDIA_CODEC_AUDIO_PCM = 1
                        audioType: 1,     // AUDIO_STREAM_GUIDANCE = 1
                        audioConfigs: [{
                            samplingRate: 16000,
                            numberOfBits: 16,
                            numberOfChannels: 1
                        }],
                        availableWhileInCall: true
                    }
                },
                {
                    id: 6,
                    mediaSinkService: {
                        availableType: 1, // MEDIA_CODEC_AUDIO_PCM = 1
                        audioType: 2,     // AUDIO_STREAM_SYSTEM_AUDIO = 2
                        audioConfigs: [{
                            samplingRate: 16000,
                            numberOfBits: 16,
                            numberOfChannels: 1
                        }],
                        availableWhileInCall: true
                    }
                },
                {
                    id: 3,
                    mediaSinkService: {
                        availableType: 2, // MEDIA_CODEC_VIDEO_H264_BP = 2
                        videoConfigs: [{
                            codecResolution: 3, // VIDEO_1920x1080 = 3
                            frameRate: 3,       // VIDEO_FPS_60 = 3
                            widthMargin: 0,
                            heightMargin: 0,
                            density: 140
                        }],
                        availableWhileInCall: true
                    }
                },
                {
                    id: 9,
                    mediaSourceService: {
                        availableType: 1, // MEDIA_CODEC_AUDIO_PCM = 1
                        audioConfig: {
                            samplingRate: 16000,
                            numberOfBits: 16,
                            numberOfChannels: 1
                        }
                    }
                },
                {
                    id: 1,
                    sensorSourceService: {
                        sensors: [
                            { sensorType: 13 }, // SENSOR_DRIVING_STATUS_DATA = 13
                            { sensorType: 1 },  // SENSOR_LOCATION = 1
                            { sensorType: 10 }  // SENSOR_NIGHT_MODE = 10
                        ]
                    }
                },
                {
                    id: 8,
                    inputSourceService: {
                        touchscreen: [{
                            width: 1920,
                            height: 1080
                        }]
                    }
                },
                {
                    id: 10,
                    bluetoothService: {
                        carAddress: "",
                        supportedPairingMethods: [0] // BLUETOOTH_PAIRING_UNAVAILABLE = 0
                    }
                }
            ],
            driverPosition: 1, // DRIVER_POSITION_RIGHT = 1
            canPlayNativeMediaDuringVr: false,
            displayName: "Coche de xendo",
            probeForSupport: false,
            connectionConfiguration: {
                pingConfiguration: {
                    timeoutMs: 3000,
                    intervalMs: 1000,
                    highLatencyThresholdMs: 200,
                    trackedPingCount: 5
                }
            },
            headunitInfo: {
                make: "XendoNodeCar",
                model: "Universal",
                year: "2018",
                vehicleId: "2024110822150988",
                headUnitMake: "f1x",
                headUnitModel: "Crankshaft-NG Autoapp",
                headUnitSoftwareBuild: "1",
                headUnitSoftwareVersion: "1.0"
            }
        };

        const encoded = this.ServiceDiscoveryResponse.encode(serviceDiscoveryResponse).finish();
        return encoded;
    }
    encodePingResponse(buffer) {
        // Decodificar como PingRequest
        try {
            const pingRequest = this.PingRequest.decode(buffer);
            console.log('PingRequest decodificado:', pingRequest);
            console.log('Timestamp:', );
            console.log('Bug report:', pingRequest.bug_report);
            
            // Crear respuesta
            const pingResponse = this.PingResponse.create({
                timestamp: new Date()
            });
            
            const encodedResponse = this.PingResponse.encode(pingResponse).finish();
            console.log('PingResponse codificado:', encodedResponse.toString('hex'));
            
            return encodedResponse;
            
        } catch (error) {
            console.error('Error decodificando PingRequest:', error);
        }
    }
    encodePingRequest() {
        try {
            // Fallback: crear PingRequest con timestamp actual
            const PingRequest = this.PingRequest.create({
                timestamp: Date.now(),
                bugReport: true,
                data: Date.now()

            });
            return this.PingRequest.encode(PingRequest).finish();

            
        } catch (error) {
            console.error('❌ Error codificando PingResponse:', error);
        
        }
    }
    bufferToBigInt(buffer) {
        let result = 0n;
        for (let i = 0; i < buffer.length; i++) {
            result = (result << 8n) | BigInt(buffer[i]);
        }
        return result;
    }

    // Método auxiliar para debug
    debugPingPayload(pingPayload) {
        console.log('🔍 DEBUG PingPayload:');
        console.log('  - Longitud:', pingPayload.length, 'bytes');
        console.log('  - Hex:', pingPayload.toString('hex'));
        console.log('  - Bytes:', Array.from(pingPayload));
        
        if (pingPayload.length >= 8) {
            const timestamp = this.bufferToBigInt(pingPayload.slice(0, 8));
            console.log('  - Timestamp:', timestamp.toString());
            
            if (pingPayload.length > 8) {
                console.log('  - Bytes adicionales:', Array.from(pingPayload.slice(8)));
            }
        }
    }

    encodeAuthResponse() {
        try {
            const authResponse = this.AuthResponse.create({
                status: 0// Éxito
            });
            console.log(authResponse)
            return this.AuthResponse.encode(authResponse).finish();
        } catch (error) {
            console.error('❌ Error codificando AuthResponse:', error);
            throw error;
        }
    }
}