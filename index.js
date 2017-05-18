const dgram = require("dgram");
const ip = require("ip");

const PORT = 1337;
//TODO improve argument parsing
const INTERFACES = (process.argv.slice(2).length > 0) ? process.argv.slice(2) : ["wlp3s0"];
const ALL_NODES_ADDRESS = "ff02::1" // this has link scope not node scope

// map of sockets for each interface
// TODO maybe make a difference between listening and sending sockets
let servers = new Map();

// key aka destination is combinationn of address (ip) and port
// TODO does the port help in anyway?
let routingTable = new Map();

const createServer = function createServer() {

  let server = dgram.createSocket("udp6");

  server.on("listening", function(){
    let address = server.address()
    console.info(`Listening on ${address.address}:${address.port}`);
    routingTable.set(`${address.address}:${address.port}`, { 'cost': 0 });
  });
  server.on("message", function(message, remote){
    //TODO filter message from us
    console.info(`Message arrived from ${remote.address}:${remote.port}`);
    console.info(message.toString());
  });
  server.on("error", function(error) {
    console.error(error);
  })

  return server;
};

const sendVector = function sendVector(vector, interface){
  console.info(`Broadcasting over ${interface.address().address}:`);
  console.info(vector);
  interface.send(JSON.stringify(vector), PORT, ALL_NODES_ADDRESS); //TODO maybe add a call back
};

const sendVectors = function sendVectors(){

  let vector = [];

  routingTable.forEach(function(destination, destinationAddress){
    vector.push([destinationAddress, destination.cost]);
  });

  INTERFACES.forEach(function(interface){
    sendVector(vector, servers.get(interface));
  });
};

setInterval(sendVectors, 1000);

// listen on multiple interfaces
INTERFACES.forEach(function(interface){
  //TODO there can be multiple addresses, which one should we use?
  let address = ip.address(interface, "ipv6");
  //TODO this is wrong!?!! address = ALL_NODES_ADDRESS;
  let server = createServer();
  console.info(`Binding server to ${address} on ${interface}`);
  //TODO check if we need the interface here
  server.bind(PORT, `${address}%${interface}`);
  servers.set(interface, server);
  
  //TODO THINK!!!
  //bind to ALL_NODES_ADDRESS of interface
  server = createServer();
  server.bind(PORT, `${ALL_NODES_ADDRESS}%${interface}`);
});
