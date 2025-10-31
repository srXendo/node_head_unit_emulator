const tls = require('tls');
const crypto = require('crypto');

class Cryptor {
    constructor() {
        this.socket = null;
        this.isActive = false;
        this.pendingData = [];
    }

    init() {
        // Crear socket TLS como servidor (head unit)
        this.socket = new tls.TLSSocket(null, {
            isServer: true,
            cert: this.certificate,
            key: this.privateKey,
            rejectUnauthorized: false
        });

        this.socket.on('secure', () => {
            this.isActive = true;
            console.log('TLS handshake completed');
        });

        this.socket.on('data', (data) => {
            this.pendingData.push(data);
        });

        this.socket.on('error', (err) => {
            console.error('TLS error:', err);
        });
    }

    decrypt(buffer) {
        const privateKey = this.privateKey;
        
        console.log('Analizando buffer TLS...');
        
        // El buffer es: [AA Header 6 bytes] + [TLS Data]
        const aaHeader = buffer.slice(0, 6);
        const tlsData = buffer.slice(6);
        
        console.log('AA Header:', aaHeader.toString('hex'));
        console.log('TLS Data length:', tlsData.length);
        
        // Buscar el PreMaster Secret cifrado en el handshake TLS
        // Normalmente está en el Client Key Exchange (handshake type 0x10)
        
        let offset = 0;
        while (offset < tlsData.length - 10) {
            // Buscar handshake record (type = 0x16)
            if (tlsData[offset] === 0x16) {
                const handshakeType = tlsData[offset + 5];
                
                if (handshakeType === 0x10) { // Client Key Exchange
                    console.log('Encontrado Client Key Exchange en offset:', offset);
                    
                    // La estructura es:
                    // [1 byte type] + [3 bytes length] + [2 bytes encrypted length] + [encrypted data]
                    const encryptedLength = tlsData.readUInt16BE(offset + 4);
                    const encryptedData = tlsData.slice(offset + 6, offset + 6 + encryptedLength);
                    
                    console.log('Datos cifrados length:', encryptedLength);
                    
                    if (encryptedLength === 256) { // Típico para RSA 2048
                        try {
                            const decrypted = crypto.privateDecrypt(privateKey, encryptedData);
                            console.log('✅ PreMaster Secret descifrado:', decrypted.toString('hex'));
                            return decrypted;
                        } catch (e) {
                            console.log('Error descifrando:', e.message);
                        }
                    }
                }
            }
            offset++;
        }
        
        console.log('No se encontró PreMaster Secret cifrado');
        return buffer;
    }
    isActive() {
        return this.isActive;
    }
}

module.exports = Cryptor;