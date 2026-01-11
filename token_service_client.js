const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'token_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const tokenProto = proto.token;

/**
 * Factory for create stub
 * @param {string} address - "host:port"
 */
function createStub(address) {
  return new tokenProto.TokenService(
    address,
    grpc.credentials.createInsecure()
  );
}

module.exports = { createStub };
