import React, { useState } from 'react';
import HtmlEditor from '../components/HtmlEditor';

export default function TestEditor() {
  const [content, setContent] = useState('');
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Test HTML Editor</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Editor</h2>
        <HtmlEditor 
          value={content} 
          onChange={setContent} 
          placeholder="Test the editor here..."
        />
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Preview</h2>
        <div 
          className="prose prose-slate max-w-none p-4 border rounded-lg bg-slate-50"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}
