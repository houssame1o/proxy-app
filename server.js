// ✅ server.js (updated to rewrite .m3u8 and proxy chunks)
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static('public'));

// Base Kick HLS URL
const KICK_STREAM_BASE = 'https://euw11-0.playlist.live-video.net/v1/playlist/';
const MASTER_PLAYLIST = `${KICK_STREAM_BASE}CukF1tIvQArPkIRBX0geCPOoQt4yFR3um29N7Upw4Efq-z-XGbt8Jy0A61BldqNj2tRxC7DmDfLzF9zvb6aLKpoyIAIVx2dhNvvb0KplGCrxFN-eNd-aH-vS6PQIcmzGaDLfOBzv2wBZKfvZJrvwNxkauiv4J_vs_3olmC6A9ybMl1tKqh_tY8VHBcwmEy3lX_h4jEYNjjJ5hBeJvwnOFG3LyEdty9ckjAA7_Z5OfMyj_XxgJuRkXMQHweYc-tjIDm0DgjWZ5D3fqbKzP1EyH2DMD6zsmDCWtUw3lvA_eLv0YAT7cBGestdEJPe20MWLVmdTzBn-IYitLXz-GPgesrDuIkVrl83zHlN09vFevToAGqxGsqkBxEVhNKXEIFj1HSwzn1UzWUoK87aFfIWNh5L6cpCa2GG1g6GKcAP0KIgcpb2Ea8PE6XmH_Sa7THlNlZVSorYMqvrFe7gzueVQS1rusuqqGZ90aVyJcet68uOBstHbmhOdreXeYoEM8wP_MNCLVtEknjDNrUVRGH7xiu43SV4fo099xD0Y-2QQkiLS_HeXLxx3369317AxJTg5jabO1HGlK0pE4ojCo5SNXlwrSLAvimx0bg--5DTlV8oFEKVVgIn67boit7o58ueUJGqRJxrJGrf6ertjmSzxwU_dsNFA51HmFiqVZkLXMeqw2fhE88ZOKL62pwSPpj29F6qG91EBueSYgDt7WzhkR7AGLIUUXONIDfxPX9gOvzlZN8Dx27756cuMDiAphTdLLycussB5hgZkde007H15EOhajGEhGNgu_wPSAGB7-aRNS7rVBosAXPF88QDZxTPyhcU-wRDPgSvDXIIilZAhXucxWdJismFEuyB84_459ftseBwuMtmTFqVbdn2OKL56aXoXcp5ZsNpZ-Y9z4goEYoNUhmbK7tf0KV6RwH34PEgHFVI8O2zZj3V9WCS7Pa3YF-ajPJP83URkEfrqGBeVYo6Puv3XisSsxohYNxoMRGLsY8xuEKH6MxAZIAEqCWV1LXdlc3QtMjCIDA.m3u8`; // Replace with real .m3u8

// Proxy the main .m3u8 file and rewrite chunk paths
app.get('/fb_stream', async (req, res) => {
  try {
    const response = await fetch(MASTER_PLAYLIST, {
      headers: {
        'User-Agent': 'Facebook/320.0.0.0 Android',
        'Referer': 'https://facebook.com'
      }
    });

    let playlist = await response.text();

    // Rewrite chunk URLs to be proxied from this server
    playlist = playlist.replace(/^(?!#)(.*\.ts|.*\.m3u8)$/gm, (line) => {
      if (line.startsWith('http')) return line;
      return `/proxy_chunk/${line}`;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(playlist);
  } catch (err) {
    console.error('M3U8 Proxy Error:', err);
    res.status(500).send('Error fetching stream');
  }
});

// Proxy individual .ts and .m3u8 chunks
app.get('/proxy_chunk/:chunkName', async (req, res) => {
  const chunk = req.params.chunkName;
  const chunkUrl = `${KICK_STREAM_BASE}${chunk}`;

  try {
    const response = await fetch(chunkUrl, {
      headers: {
        'User-Agent': 'Facebook/320.0.0.0 Android',
        'Referer': 'https://facebook.com'
      }
    });

    if (!response.ok) throw new Error(`Chunk fetch failed: ${response.status}`);

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    response.body.pipe(res);
  } catch (err) {
    console.error('Chunk Proxy Error:', err);
    res.status(500).send('Error fetching chunk');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
});
