console.log("Script started");

async function testWebhook() {
  try {
    const res = await fetch("https://script.google.com/macros/s/AKfycbyc54r9e3MuJGy0U2BLCEYFlIlRTYjsOVs9OyuupgzalCKserDMiQaymXHh9VuSdRPU/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TestUser",
        phone: "03001234567",
        leadId: "test123",
      }),
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.log("CAUGHT ERROR:", err);
  }
}

testWebhook().then(() => {
  console.log("Script finished");
});