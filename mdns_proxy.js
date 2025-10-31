const net = require('net');
class AndroidAutoServer {
    constructor() {
        this.port = 5000;
        this.server = null;
        this.movil_socket = null;
        this.pi_socket = null
    }
    
    startServer() {


        this.server = net.createServer((socket) => {
            console.log(`📡 Conexión Android Auto desde: ${socket.remoteAddress}:${socket.remotePort}`);
            this.handleAAConnection(socket);
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 Servidor Android Auto escuchando en puerto ${this.port}`);
        });

        this.server.on('error', (err) => {
            console.log('❌ Error servidor AA:', err);
        });
    }

    handleAAConnection(socket) {
        this.movil_socket = socket
        this.pi_socket = this.connectToPi()
        socket.on('data', (data) => {
            console.log('📨 Datos RECIBIDOS de AA:', data.toString('hex'));
            this.pi_socket.write(data)
        });

        socket.on('close', () => {
            console.log('❌ Conexión AA cerrada');
        });

        socket.on('error', (err) => {
            console.log('❌ Error conexión AA:', err);
        });
        return socket
    }
    connectToPi(host = '127.0.0.1', port = 5001) {
        console.log(`🔌 Conectando a raspberry...`);
        
        const client = new net.Socket();
        
        client.connect(port, host, () => {
            console.log('✅ Conectado al servidor rasbperry');
        });
        
        client.on('data', (data) => {
            console.log('📨 Datos RECIBIDOS de raspberry:', data.toString('hex'));
            this.movil_socket.write(data)
        });
        
        client.on('error', (err) => {
            console.log('❌ Error de conexión pi:', err.message);
        });
        
        client.on('close', () => {
            console.log('🔌 Conexión cerrada pi');
        });
        return client
    }

}
(new AndroidAutoServer()).startServer()
module.exports = AndroidAutoServer