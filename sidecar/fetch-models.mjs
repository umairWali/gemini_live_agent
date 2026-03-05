import https from 'https';

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${process.env.API_KEY}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const json = JSON.parse(data);
        for (const m of json.models) {
            if (m.name.includes('gemini-2')) {
                console.log(m.name, m.supportedGenerationMethods);
            }
        }
    });
});
req.end();
