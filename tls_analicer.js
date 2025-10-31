// analyze-tls-complete.js
const crypto = require('crypto');

class TLSCompleteAnalyzer {
    analyzeClientHello(hexString) {
        const buffer = Buffer.from(hexString, 'hex');
        console.log('🔍 CLIENTHELLO TLS COMPLETO:\n');
        console.log('Longitud total:', buffer.length, 'bytes\n');

        this.parseTLSRecord(buffer);
    }

    parseTLSRecord(buffer) {
        console.log('=== TLS RECORD LAYER ===');
        const contentType = buffer[0];
        const version = buffer.slice(1, 3);
        const length = buffer.readUInt16BE(3);
        
        console.log('Content Type:', `0x${contentType.toString(16)} (${this.getContentType(contentType)})`);
        console.log('Version:', `0x${version.toString('hex')} (${this.getTLSVersion(version)})`);
        console.log('Length:', length, 'bytes\n');

        this.parseHandshake(buffer.slice(5));
    }

    parseHandshake(handshakeData) {
        const handshakeType = handshakeData[0];
        const handshakeLength = handshakeData.readUIntBE(1, 3);
        
        console.log('=== HANDSHAKE PROTOCOL ===');
        console.log('Type:', `0x${handshakeType.toString(16)} (${this.getHandshakeType(handshakeType)})`);
        console.log('Length:', handshakeLength, 'bytes\n');

        this.parseClientHelloDetails(handshakeData.slice(4));
    }

    parseClientHelloDetails(clientHello) {
        let offset = 0;
        
        // ClientVersion
        const clientVersion = clientHello.slice(offset, offset + 2);
        offset += 2;
        console.log('=== CLIENTHELLO INTERNO ===');
        console.log('Client Version:', `0x${clientVersion.toString('hex')} (TLS 1.2)`);
        
        // Random (32 bytes)
        const random = clientHello.slice(offset, offset + 32);
        offset += 32;
        console.log('Random (32 bytes):', random.toString('hex'));
        console.log('   GMT Unix Time:', random.readUInt32BE(0));
        console.log('   Random Bytes:', random.slice(4).toString('hex').substring(0, 40) + '...');
        
        // Session ID
        const sessionIdLength = clientHello[offset];
        offset += 1;
        const sessionId = clientHello.slice(offset, offset + sessionIdLength);
        offset += sessionIdLength;
        console.log('Session ID:', sessionIdLength > 0 ? sessionId.toString('hex') : 'Empty (new session)');
        
        // Cipher Suites
        const cipherSuitesLength = clientHello.readUInt16BE(offset);
        offset += 2;
        const cipherSuites = clientHello.slice(offset, offset + cipherSuitesLength);
        offset += cipherSuitesLength;
        
        console.log('Cipher Suites:', cipherSuitesLength / 2, 'suites');
        this.parseCipherSuites(cipherSuites);
        
        // Compression Methods
        const compressionLength = clientHello[offset];
        offset += 1;
        const compressionMethods = clientHello.slice(offset, offset + compressionLength);
        offset += compressionLength;
        console.log('Compression Methods:', Array.from(compressionMethods).map(b => `0x${b.toString(16)}`).join(', '));
        
        // Extensions
        if (offset < clientHello.length) {
            const extensionsLength = clientHello.readUInt16BE(offset);
            offset += 2;
            console.log('Extensions Length:', extensionsLength, 'bytes');
            this.parseExtensions(clientHello.slice(offset, offset + extensionsLength));
        }
    }

    parseCipherSuites(cipherSuites) {
        const suites = [];
        for (let i = 0; i < cipherSuites.length; i += 2) {
            const suite = cipherSuites.readUInt16BE(i);
            suites.push(`0x${suite.toString(16).padStart(4, '0')}`);
        }
        
        console.log('   Top 10 Cipher Suites:');
        suites.forEach(suite => {
            console.log('   ', suite, this.getCipherSuiteName(suite));
        });
        

    }

    parseExtensions(extensions) {
        let offset = 0;
        console.log('\n=== TLS EXTENSIONS ===');
        
        while (offset < extensions.length) {
            const type = extensions.readUInt16BE(offset);
            const length = extensions.readUInt16BE(offset + 2);
            
            console.log(`Type: 0x${type.toString(16).padStart(4, '0')} (${this.getExtensionType(type)}) - ${length} bytes`);
            
            // Parse specific extensions
            if (type === 0x0000) { // Server Name
                this.parseServerNameExtension(extensions.slice(offset + 4, offset + 4 + length));
            }
            else if (type === 0x000d) { // Signature Algorithms
                this.parseSignatureAlgorithms(extensions.slice(offset + 4, offset + 4 + length));
            }
            else if (type === 0x002b) { // Supported Versions
                this.parseSupportedVersions(extensions.slice(offset + 4, offset + 4 + length));
            }
            else if (type === 0x0033) { // Key Share
                this.parseKeyShare(extensions.slice(offset + 4, offset + 4 + length));
            }
            
            offset += 4 + length;
        }
    }

    parseServerNameExtension(data) {
        const listLength = data.readUInt16BE(0);
        const type = data.readUInt8(2);
        const nameLength = data.readUInt16BE(3);
        const name = data.slice(5, 5 + nameLength).toString();
        
        console.log('   Server Name:', name);
    }

    parseSignatureAlgorithms(data) {
        const length = data.readUInt16BE(0);
        console.log('   Signature Algorithms:', length / 2, 'algorithms');
    }

    parseSupportedVersions(data) {
        const length = data[0];
        console.log('   Supported Versions:');
        for (let i = 1; i < data.length; i += 2) {
            const version = data.slice(i, i + 2);
            console.log('     ', `0x${version.toString('hex')} (${this.getTLSVersion(version)})`);
        }
    }

    parseKeyShare(data) {
        const length = data.readUInt16BE(0);
        console.log('   Key Share Entries:', length, 'bytes');
        // This contains the client's public key for key exchange
    }

    // Helper methods
    getContentType(type) {
        const types = {0x16: 'Handshake'};
        return types[type] || 'Unknown';
    }

    getTLSVersion(version) {
        const versions = {
            '0x0301': 'TLS 1.0',
            '0x0302': 'TLS 1.1', 
            '0x0303': 'TLS 1.2',
            '0x0304': 'TLS 1.3'
        };
        return versions['0x' + version.toString('hex')] || 'Unknown';
    }

    getHandshakeType(type) {
        const types = {0x01: 'ClientHello'};
        return types[type] || 'Unknown';
    }

    getExtensionType(type) {
        const types = {
            0x0000: 'server_name',
            0x000a: 'supported_groups',
            0x000b: 'ec_point_formats', 
            0x000d: 'signature_algorithms',
            0x0010: 'application_layer_protocol_negotiation',
            0x0017: 'extended_master_secret',
            0x002b: 'supported_versions',
            0x002d: 'psk_key_exchange_modes',
            0x0033: 'key_share'
        };
        return types[type] || 'unknown';
    }

    getCipherSuiteName(suite) {
        const suites = {
            '0x1301': 'TLS_AES_128_GCM_SHA256',
            '0x1302': 'TLS_AES_256_GCM_SHA384',
            '0x1303': 'TLS_CHACHA20_POLY1305_SHA256',
            '0xc02c': 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
            '0xc030': 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
            '0x009f': 'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384',
            '0xcca9': 'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
            '0xcca8': 'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
            '0xc02b': 'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
            '0xc02f': 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256'
        };
        return suites[suite] || 'Unknown';
    }
}

// USO
const analyzer = new TLSCompleteAnalyzer();
const clientHelloHex = '160301011601000112030302ea43523d576dbdcd2af4c5d483a8c17078e51e0bf61d4b865c812231427aba20539cd288cec6aae509606486dca28ba98d1aac75467651536298c63388096124003e130213031301c02cc030009fcca9cca8ccaac02bc02f009ec024c028006bc023c0270067c00ac0140039c009c0130033009d009c003d003c0035002f00ff0100008b000b000403000102000a000c000a001d0017001e00190018002300000016000000170000000d002a0028040305030603080708080809080a080b080408050806040105010601030303010302040205020602002b00050403040303002d00020101003300260024001d002096a0f55491a7d136073d0c6b955df972dda896d2866548ab1b02ac7fa328176f';
analyzer.analyzeClientHello(clientHelloHex);