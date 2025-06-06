module.exports = {
  contracts_build_directory: './client/src/contracts',
  
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    }
  },

  mocha: {},

  compilers: {
    solc: {
      version: "0.8.19"
    }
  }
};
