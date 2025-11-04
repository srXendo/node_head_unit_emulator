const tls_server = require("./tls_server");
const net = require('net');
const C_PROTO = require('../helpers/aasdk_protobuf')
const ip_client = `::ffff:192.168.1.134`
module.exports = class MdnsServer{
    waiting_response = [];
    constructor(){
        this.C_PROTO = new C_PROTO()
        this.C_PROTO.loadProtobufs()
        this.movil_socket = null;
        this.tls_socket = null
        this.helloClient = null
        this.idx = 0;
    }
    start(port = 5277) {
        
        this.server = net.createServer((socket) => {
            console.log('\n🔌 Nueva conexión:',socket.remoteAddress);
            this.handleClientConnection(socket);
        });
        this.server.on('error', (err)=>{
            console.error(new Error(err))
        })
        this.server.listen(5000, () => {
            this.tls_server = new tls_server(this.channel_open_request_receive.bind(this))
            console.log(`🚀 Servidor mdns en puerto ${port}`);
            console.log('⏳ Esperando conexión de teléfono móvil...');
        });
        
    }
    channel_open_request_receive(id_service){

        this.waiting_response.push(id_service)
        console.log('channel_open_request_receive', id_service)
    }
    handleClientConnection(socket){
        try{

            socket.on('data', (data)=>{
                console.log('\n📨 RECIBIDO:', socket.remoteAddress, data.toString('hex'));
                if(socket.remoteAddress === ip_client){
                    this.handleClientDataMovil(socket, data)
                }else{
                    this.handleClientDataTls(socket, data)
                }
            })
            socket.on('close', ()=>{
                console.log('Teléfono móvil desconectado');
            })
            socket.on('error', (err)=>{
                console.error(new Error(err))
                console.error(new Error(err.stack))
            })
            console.log(socket.remoteAddress, ip_client)
            if(socket.remoteAddress === ip_client){
                this.movil_socket = socket
                console.log('sendHandShack To movil()')

                socket.write(Buffer.from('00030006000100010006', 'hex'))

                
            }
        }catch(err){
            console.error(new Error(err))
            console.error(new Error(err.stack))
        }
    }
    handleClientDataMovil(socket, data2){
        const splited = this.split_multipayload(data2)

        for(let row of splited){
            
            const data = row.row
            let message = this.parseMessage(data)
            console.log('handleClientDataMovil()', message.id_message)
            if(this.splited_data){
                this.splited_data.data = Buffer.concat([this.splited_data.data, data]),
                this.splited_data.payloadNowLength = this.splited_data.payloadNowLength + data.length

                console.log('splitted data: ', this.splited_data.payloadLength, this.splited_data.payloadNowLength)
                if(this.splited_data.payloadLength <= this.splited_data.payloadNowLength){
                    const residues =  this.splited_data.payloadNowLength - this.splited_data.payloadLength
                    this.splited_data.payloadNowLength = this.splited_data.payloadLength
                    this.splited_data.data = this.splited_data.data.slice(0, this.splited_data.payloadLength)
                    console.log('send splitted data: ', this.splited_data.data, this.splited_data.data.slice(4))
                    this.tls_socket.write(this.splited_data.data.slice(4), ()=>{
                        
                    })
                    this.splited_data = false

                }
                
            }else{
                message = this.parseMessage(data)
                if(data.readUint8(3) === 8){
                    console.log('send tls_socket', this.add_head_handshack(this.helloClient).toString('hex'))
                    socket.write(this.add_head_handshack(this.helloClient))
                }else{
                    const data_payloadlength = data.readUint16BE(2)
                    console.log('data_payloadlength > data.slice(4).length: 2345: ', data_payloadlength > data.slice(4).length, data_payloadlength, data.slice(4).length)
                    
                    if(splited.length > 1){
                        console.log('multipayload')
                    }
                    switch(message.id_message){
                        case 0x02:
                            //const clientHello = this.createEncapsulatedSSL();
                            



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

                                console.log('openChannel Request')

                        
                        case 2346:

                            console.log('splited', splited)
                            
                            if(data_payloadlength > data.slice(4).length){
                                this.splited_data = {
                                    data: data,
                                    payloadLength: data_payloadlength,
                                    payloadNow: data.slice(4),
                                    payloadNowLength: data.slice(4).length
                                }
                            }else{
                                this.send_open_channel(row.row.readUint8(0), row.row)
                            }
                        
                            
                            //socket.write(Buffer.from('000b0111170303010caa58cee50637f188f83762a9a974502c778c6ae1b398ce1e87a0793c58a6448b1cd602b990fb2f1d0c63d3f67cbd9fc1200310e6526a2c7e25664cb9e28d018ca3db376b65d21b93cd2c570ccba34511efebffef20839a2bfc375b01a730fb23d8d365731dd4a24dd783e01e4195a7b752ddb1e88bd9aeb7f56a21b50a26ad6767372b664935f5290911f0d10faee8b1747b95642b596246e5877bbc30fbc198ffb26afa7c8b22b8726d58213d4f672dcd8b9e54fae5e220ab32d38664b9c0d1aee45550dd61c6902a5b8f89d996463fd287eb3000951240b3378786b61e8fedb03962b5b45b3643fba5c586651fa850ab1f1ae06c1c179542366691233796e9ee2e241ad017563b8e9f4b52','hex'))
                        break;
                        case 0:
                            const data_payloadlength2 = data.readUint16BE(2)
                            console.log('data_payloadlength > data.slice(4).length 00 : ', data_payloadlength2 > data.slice(4).length)

                            if(data_payloadlength2 > data.slice(4).length){
                                this.splited_data = {
                                    data: data,
                                    payloadLength: data_payloadlength2,
                                    payloadNow: data.slice(4),
                                    payloadNowLength: data.slice(4).length
                                }
                            }else{
                                this.send_open_channel(row.row.readUint8(0), row.row)
                            }
                            

                        break;
                        default:
                            console.error(new Error('message id no identificado: '+message.id_message, ));
                            
                    }
                }
            }
        }
    }
    split_multipayload(buffer){
        const payloadLength = buffer.readUint16BE(2)
        const id = buffer.readUint16BE(0)
        const payload = buffer.slice(4, payloadLength+4)
        const row = buffer.slice(0, payloadLength+4)
        if(payloadLength < buffer.length - 8){
            return [{row, payloadLength, id, payload}, ...this.split_multipayload(buffer.slice(payloadLength+4, buffer.length))]
        }else{
            return [{row, payloadLength, id, payload}]
        }
    }
    send_open_channel(id_channel, data){
        this.tls_socket.write(data.slice(4))
    }
    handleClientDataTls(socket, data2){
        console.log('handleClientDataTls()', data2.length)
        let splited_tls
        if(data2.readUint8(0) === 0x16){
            splited_tls = [data2]
        }else{
            splited_tls = this.split_multipayload_tls(data2)
        }
         
        for(let data of splited_tls){
            if(this.waiting_response.length > 0){
                
                console.log('waiting_response')
            
                    const buf_header = Buffer.alloc(4);
                    console.log(this.waiting_response)
                    buf_header.writeUint8(this.waiting_response[0].id_service, 0);
                    buf_header.writeUint8(this.waiting_response[0].flag_service, 1);
                    this.waiting_response = this.waiting_response.slice(1)


                    buf_header.writeUint16BE(data.length, 2);
                    const fullMessage = Buffer.concat([buf_header, data]);
                    console.log('sendOpenChannelResponse: ', fullMessage)
                    this.movil_socket.write(fullMessage)
                

            }else{
                
                switch(data.readUint8(2)){ //handshack type
                    case 0x03://client recive responseHello
                        if(data.readUint8(0) === 0x17){
                            
                            if(data.readUint8(4) === 0x1e){
                                const buf_header = Buffer.alloc(4);
                                buf_header.writeUint16BE(0x000b, 0);
                                buf_header.writeUint16BE(data.length, 2);
                                const fullMessage = Buffer.concat([buf_header, data]);
                                this.movil_socket.write(fullMessage)
                                console.log('send to movil socket', fullMessage.toString('hex').substring(0, 100) + '...');
                            }else{
                                const buf_header = Buffer.alloc(4);
                                buf_header.writeUint16BE(0x000b, 0);
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
                        this.helloClient = data
                        break;
                    default:
                        console.error(`handhsack client node not recognice: ${data.readUint8(2)}`);
                        break;
                }
            }
        }
    }
    split_multipayload_tls(buffer){
        return buffer.toString('hex').replaceAll('170303', ';170303').split(';').slice(1).map(i=>Buffer.from(i,'hex'))
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
}