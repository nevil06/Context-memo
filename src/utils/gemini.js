import https from 'https';

export async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000
    }
  };

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Gemini API error: ${res.statusCode} - ${data}`));
          return;
        }

        try {
          const response = JSON.parse(data);
          
          if (!response.candidates || response.candidates.length === 0) {
            reject(new Error('No response from Gemini'));
            return;
          }

          const text = response.candidates[0].content.parts[0].text;
          resolve(text);
        } catch (error) {
          reject(new Error(`Failed to parse Gemini response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

export function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
