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

//TODO remove map?
let localAddresses = INTERFACES.map(function(interface){
  return ip.address(interface, "ipv6");
});

const createServer = function createServer(interface, includeInRoutingTable) {

  let server = dgram.createSocket("udp6");

  server.on("listening", function(){
    let address = server.address()
    console.info(`Listening on ${address.address}:${address.port}`);
    if(includeInRoutingTable) {
      //routingTable.set(`${address.address}:${address.port}`, { 'cost': 0 });
      let destination = {
        'cost': 0,
        'link': interface,
        'time': null
      };
      routingTable.set(address.address, destination);
    }
  });
  server.on("message", function(message, remote){
    //do not handle messages from us
    //TODO maybe check port too?
    if(localAddresses.includes(remote.address)) {
      return;
    }
    let vector = new Map(JSON.parse(message));
    console.info(`Message arrived from ${remote.address}:${remote.port}`);
    console.info(vector);

    // TODO get link/interface and cost
    let linkCost = 1;

    vector.forEach(function(cost, destinationAddress){
      if(!routingTable.has(destinationAddress)){
        // new route
        let destination = {
          'cost': cost + linkCost,
          'link': interface,
          'time': null
        };
        routingTable.set(destinationAddress, destination);
      } else {
        //TODO do we need information about us? we do know how to route to us
        if(localAddresses.includes(destinationAddress)) { return; }
        let destination = routingTable.get(destinationAddress);
        //TODO understand second part of condition and why it seems broken
        //console.info(interface == destination.link);
        if((cost + linkCost) < destination.cost || interface == destination.link) {
        //if((cost + linkCost) < destination.cost) {
          destination.cost = cost + linkCost;
          destination.link = interface;
          destination.time = null;
        }
      }
    });
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

  console.info("Routing table:");
  console.info(routingTable);

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
  let server = createServer(interface, true);
  console.info(`Binding server to ${address} on ${interface}`);
  //TODO check if we need the interface here
  server.bind(PORT, `${address}%${interface}`);
  servers.set(interface, server);

  //TODO THINK!!!
  //bind to ALL_NODES_ADDRESS of interface
  server = createServer(interface);
  server.bind(PORT, `${ALL_NODES_ADDRESS}%${interface}`);
  //TODO add server/socket to set of sockets
});
