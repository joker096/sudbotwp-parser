const fs = require('fs');
['006-zashchita-prav-potrebiteley-v-sude.json','007-grazhdanskie-dela-sroki-inache-preryvayutsya.json','008-sudebnye-raskhody-komu-i-do-kakoy-summy-kompensiruyut.json'].forEach(f => {
  const p = JSON.parse(fs.readFileSync('generated-posts/'+f,'utf-8'));
  const text = p.content.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const words = text.split(' ').length;
  const chars = p.content.length;
  const tables = (p.content.match(/<table>/g)||[]).length;
  const faqQ = (p.content.match(/"@type": "Question"/g)||[]).length;
  const cta = (p.content.match(/cta-box/g)||[]).length;
  console.log(f.replace('.json','')+': '+words+' слов, '+chars+' символов, '+tables+' табл, '+faqQ+' FAQ, '+cta+' CTA');
});
fs.unlinkSync('generated-posts/_check.js');
