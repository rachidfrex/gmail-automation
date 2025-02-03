const net = require('net');

function waitForAppium(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function tryConnect() { 
      const socket = new net.Socket();

      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();

        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for Appium'));
          return;
        }

        setTimeout(tryConnect, 1000);
      });

      socket.connect(port, '127.0.0.1');
    }

    tryConnect();
  });
}

module.exports = waitForAppium;
