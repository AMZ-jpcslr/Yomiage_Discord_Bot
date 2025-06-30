require('dotenv').config();

console.log('TOKEN:', process.env.TOKEN ? '***HIDDEN***' : 'NOT SET');
console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('TOKEN length:', process.env.TOKEN ? process.env.TOKEN.length : 0);
console.log('TOKEN starts with:', process.env.TOKEN ? process.env.TOKEN.substring(0, 10) + '...' : 'N/A');
