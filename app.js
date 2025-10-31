let dbus = require('dbus-next');
const { Variant } = dbus;
const AgentInterface = dbus.interface.Interface;
const protobuf = require('protobufjs');
const fs = require('fs').promises;
const path = require('path');
const rfcommServer = require('./servers/rfcomm')
const AndroidAutoServer = require('./servers/mdns')

// Cargar protobufs
const root = protobuf.loadSync('protos.proto');

// Obtener tipos necesarios
const ControlMessageType = root.lookupEnum('ControlMessageType');
const MessageStatus = root.lookupEnum('MessageStatus');


let Message = dbus.Message;




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

    const mdns = new AndroidAutoServer()
    mdns.start(5000);

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
