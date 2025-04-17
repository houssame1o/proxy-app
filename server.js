// 🔁 Node.js Proxy Server for disguising Kick.com stream as Facebook

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Use native fetch for Node.js >=18
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Serve static site (public/index.html)
app.use(express.static('public'));

// 🔗 Actual Kick.com or HLS Stream Source (can test with a public one)
const KICK_STREAM_URL = 'https://euc13-0.playlist.live-video.net/v1/playlist/CugFzTP3lbMK4N5U9oE4uhl0BN5mhQnhMZF_pwIHCy_YRLOKQOKZyiGUS3BQYpEitN4edd2HxPFGd-kXyRwaUWzThQBUwnJq2dnKTI7gtKgo7eyMc0fHHN6ejPAmgvd0n1B_OodJsvmzT974JuyNW4gr96mHvqRJohKqcsTh9TCO0ev7k7DK5dEIDK4_ab4L83MMFSowltHU1y1bcEU_vsEL_DP7OE4wsumyUVAtUJ7dTbLHTeb5Zbma68flGDqi5SAn-0EWnJ5Yvtf-NmTnW8MUpe86jOr_ePZ7tVeAOHze0HAwj9bFpjw-vpm37qQrSNCrCSiS1qQKEazsvlUyighBphn_mKc8zFLVAs7IkTjGkfWHVtRz6F1cpviPlJ622sPLLnSPx30kmM1Tp4zlwzmjVxU7wK3PGnkzEcgLYlQ5al-JuSHy8oerXv_PYrgYwqsfW5OSUgkzYqeKW8NnY2AWfmxdnKDR3KyOmEfOqZRDCY_-4qqs2h3C4_5SimNySfo90xOAONULRIVwW-nxdL2MWEu2jKrqEXBEY9u5MNgidMxwTtKvVlMWHmkkiTxl2e_Ft8iLqf2Gsrh-UHk0uRGEU8z5tShM5YKXlSo4SnHpfqf6CxGpCuAR2BTGxLNnLWp-DNNR1shGW71KDJsK9NGqSXpxBaM7_HsRtSiVFWS0kwdcsRH_sOW_06w1_3R5t8hWoiDVeMya0iWzecQOrsvL_Zl5AZ9_uukEje085WPlnKk-fnuo9qOjcki9USo_Yf4e5kQRQLsMFi3lVH8pswLq1H0aqc8K1dSkhgAtIQWcARdtTkLbHqBeFN2ZK3O8bSYk0iQ6WmXZ_LhJqheYKhBFkAfvYbI3SFLRIMW5tlLmjIeecMTJA6jQeV0PV1tkXn-JeoGXLhyIdY5rCvBgelUxWZUuD5VkJ_Dci1JcbG960G7aJxnRPPV4DGzvMwNBHjlmi4XVE875vkTwZMyzWxPlkYjjIamTNbOQGgyEhnUyxT9LOwJpOEogASoJZXUtd2VzdC0yMIgM.m3u8';
// 🔁 Example real Kick stream: replace this once test works

app.get('/fb_stream', async (req, res) => {
  try {
    const response = await fetch(KICK_STREAM_URL, {
      headers: {
        'User-Agent': 'Facebook/320.0.0.0 Android',
        'Referer': 'https://facebook.com'
      }
    });

    console.log("FETCH STATUS:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FAILED RESPONSE BODY:", errorText);
      return res.status(500).send('Error fetching stream');
    }

    let playlist = await response.text();

    // 📌 Fix relative URLs (replace .m3u8/.ts paths with full Kick URLs)
    const baseUrl = KICK_STREAM_URL.substring(0, KICK_STREAM_URL.lastIndexOf('/') + 1);
    playlist = playlist.replace(/^(?!#)(.*\.m3u8|.*\.ts)$/gm, (match) => {
      if (match.startsWith("http")) return match;
      return baseUrl + match;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(playlist);

  } catch (err) {
    console.error('Stream Error:', err);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
