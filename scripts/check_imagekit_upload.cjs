const fs = require('fs');

const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/shreebanrasisarees';
const url1 = `${IMAGEKIT_URL_ENDPOINT}/products/S18584/ipj33nv1itf.jpg`;
const url2 = `${IMAGEKIT_URL_ENDPOINT}/products/S18457/s1urzzls4g.jpg`;
const url3 = `${IMAGEKIT_URL_ENDPOINT}/products/S10068/d4uzqu975pw.jpg`;

async function test() {
    for (const u of [url1, url2, url3]) {
        const res = await fetch(u);
        console.log(u, "-> GET status:", res.status, "content-type:", res.headers.get('content-type'));
        const headRes = await fetch(u, { method: 'HEAD' });
        console.log(u, "-> HEAD status:", headRes.status);
    }
}

test();
