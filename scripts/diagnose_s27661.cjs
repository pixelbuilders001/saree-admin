const url = "https://ik.imagekit.io/shreebanrasisarees/products/S27661/tsw397rs2u.jpg";

async function test() {
    console.log("Checking:", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Status text:", res.statusText);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Body length:", text.length);
    if (text.length < 500) console.log("Body:", text);
}

test();
