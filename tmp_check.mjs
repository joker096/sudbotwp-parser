import('dotenv').then(m => console.log('dotenv OK')).catch(e => console.log('dotenv MISSING:', e.message));
import('qs').then(m => console.log('qs OK')).catch(e => console.log('qs MISSING:', e.message));
