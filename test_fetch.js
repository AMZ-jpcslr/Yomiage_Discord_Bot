// HTTP クライアントテスト
console.log('Testing HTTP client setup...');

try {
    // Node.js 18+ の標準 fetch または undici を使用
    let fetch;
    if (typeof globalThis.fetch !== 'undefined') {
        fetch = globalThis.fetch;
        console.log('✅ Using global fetch (Node.js 18+)');
    } else {
        // Node.js 18未満の場合はundiciを使用
        const { fetch: undiciFetch } = require('undici');
        fetch = undiciFetch;
        console.log('✅ Using undici fetch (Node.js <18)');
    }
    
    console.log('Fetch function type:', typeof fetch);
    console.log('✅ HTTP client setup successful!');
} catch (error) {
    console.error('❌ HTTP client setup failed:', error.message);
}
