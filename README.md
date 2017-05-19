# node-distancevector

This is a toy project to understand distance vector routing in its simplest
form.

## testing

Create three virtual interfaces for testing:

```
sudo ip link add type veth
sudo ip link add type veth
sudo ip link add type veth
```

Activate interfaces:

```
sudo ip link set dev veth0 up
sudo ip link set dev veth1 up
sudo ip link set dev veth2 up
sudo ip link set dev veth3 up
sudo ip link set dev veth4 up
sudo ip link set dev veth5 up
```

### node to node test

```
node index.js veth0
node index.js veth1
```

#### chain of three nodes

```
node index.js veth0
node index.js veth1 veth2
node index.js veth3
```

#### trinagle of nodes

```
node index.js veth0 veth4
node index.js veth1 veth2
node index.js veth3 veth5
```
