// ✅ server.js (updated to rewrite .m3u8 and proxy chunks)
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static('public'));

// Base Kick HLS URL
const KICK_STREAM_BASE = 'https://euw11-0.playlist.live-video.net/v1/playlist/';
const MASTER_PLAYLIST = `${KICK_STREAM_BASE}CukFyrRWAYtz6_IMEXqDL-A-M-5UO2paSl88_0YPVxYU-t2WPAAowsA22CJ2qL8kVC4BXvPxfyZQEbkPKzwb2sK4WZI_57GypEnPuLcLg8iPqH3Zxbkz6JCaDoRYv1FEufsuu0GdfC0jMRZke4edO-Hbr97GLf9sm8o0wbwfgq1lcv_9C0k4aKUAD1UOzqVb1ffMs-Vfp16VQUm85NJ92fz5I2hwqDjNpn1jA-bv_MaMPOjCb7dlYQyvvf-YPsPk5eEWeYryX0FFwHGfA-HH7l839xzoAffgUflidi0ab6Ng8bhVx1ngYcEU9MqTkp_D-Cp6V8cOzidbwa3uU2_hjnAOTXhfNxWYtlXoMtbBvVJyrFiJ0Hw0gIWacGj8HQrxch7D4IW-mCkzHcN6s4me8jkuQYvzJ0kG0NrTCG7R-s4ISG7dNxSO6_H4OCWFpyYxtMUgkjZJnmPvl23edWp7VgBxJtnMyPfJ5-jMuBerINYDeApLQpZqpjCEmyl3j0SjFQjmM03ba02mOUz5AWvIvFKwFisD2fptvqbFkT4pmO9t6bYhdtACzwbiqBQbrH_65eq4MEynd4iO9ltXjcBs3RcHE44rw-i8ixppLE1wGPYf-R16KAIg0xFFJ-B5r3HkPzD5RtIWnTe9SLskcLwh2SppQhvYD101koTImxqroiBiv7b5UBFQysRH8IWE2Q7we_licYMa2SLsV02O8Iw-x_JR78gJQG8Qldy95VK8f5GYOoJazq-dqkTDZE-_Mp6ap48Pq08Nlp52hq_FH_2BTbBitNGSyctm1Zx1nC37omLe0MZdLmOEMg3tqpX-xG1nusTj1YV8QLLb7jvq7AgihOivia55DC2omB8zt3wCoL7xHgQBZltoSti2sCwbfnW7KFMYatonDc6AJt8D82Ny2zlHErtXzX4Hkii2QaR8VWc9w9FtiFaevZSrpU6qB7bSV_5kZmzVeo5OctfXhVZ2p2aiyrpKO-3RMV06RhoMm7DBaOmGapG9vIK9IAEqCWV1LXdlc3QtMjCIDA.m3u8

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
