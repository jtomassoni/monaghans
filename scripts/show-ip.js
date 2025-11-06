const { networkInterfaces } = require('os');

function getLocalIP() {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIP();
const port = process.env.PORT || 3000;

console.log('\n🚀 Starting Next.js dev server...\n');
console.log('📱 Access from your phone:');
console.log(`   http://${ip}:${port}\n`);
console.log('💻 Local access:');
console.log(`   http://localhost:${port}\n`);

