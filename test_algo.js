async function test() {
    const lat = 32.0853;
    const lon = 34.7818;
    const radius = 15000;
    const query = `
                [out:json];
                (
                  node["tourism"="viewpoint"](around:${radius},${lat},${lon});
                  way["tourism"="viewpoint"](around:${radius},${lat},${lon});
                  node["natural"="beach"](around:${radius},${lat},${lon});
                  way["natural"="beach"](around:${radius},${lat},${lon});
                );
                out center 20;
            `;
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch Error: ", e);
    }
}
test();
