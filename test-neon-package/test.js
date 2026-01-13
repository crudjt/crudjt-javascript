// This binding was generated automatically to ensure consistency across languages
// Generated using ChatGPT (GPT-5) from the canonical Ruby SDK
// API is stable and production-ready

const CRUDJT = require('crudjt');
const { performance } = require('perf_hooks');
const os = require('os');

function sortObjectByKeyRecursive(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sorted = Object.keys(obj).sort().reduce((result, key) => {
        result[key] = sortObjectByKeyRecursive(obj[key]);
        return result;
    }, {});

    return sorted;
}

function objectToString(obj) {
    return JSON.stringify(sortObjectByKeyRecursive(obj));
}

console.log(`OS: ${process.platform}`);
console.log(`CPU: ${os.arch()}`);

async function main() {
    await CRUDJT.Config.startMaster({
      encrypted_key: 'Cm7B68NWsMNNYjzMDREacmpe5sI1o0g40ZC9w1yQW3WOes7Gm59UsittLOHR2dciYiwmaYq98l3tG8h9yXVCxg=='
    });

    // without metadata
    console.log('Checking without metadata...');
    let data = { user_id: 42, role: 11 };
    let expectedData = sortObjectByKeyRecursive({ data: { ...data } });

    let edData = { user_id: 42, role: 8 };
    let expectedEdData = sortObjectByKeyRecursive({ data: { ...edData } });

    let token = await CRUDJT.create(data);

    console.log(objectToString(await CRUDJT.read(token)) === objectToString(expectedData));
    console.log(await CRUDJT.update(token, edData) === true);
    console.log(objectToString(await CRUDJT.read(token)) === objectToString(expectedEdData));
    console.log(await CRUDJT.delete(token) === true);
    console.log(await CRUDJT.read(token) === null);

    // with metadata
    console.log('Checking ttl...');
    data = { user_id: 42, role: 11 };

    let ttl = 5;
    let tokenWithttl = await CRUDJT.create(data, ttl);

    let expectedttl = ttl;
    for (let i = 0; i < ttl; i++) {
        console.log(objectToString(await CRUDJT.read(tokenWithttl)) === objectToString({ metadata: { ttl: expectedttl }, data: data }));
        expectedttl -= 1;

        await new Promise(resolve => setTimeout(resolve, 1000)); // Затримка 1 секунда
    }
    console.log(await CRUDJT.read(tokenWithttl) === null);

    // when expired ttl
    console.log('when expired ttl');
    data = { user_id: 42, role: 11 };
    ttl = 1;
    token = await CRUDJT.create(data, ttl);
    await new Promise(resolve => setTimeout(resolve, ttl * 1000)); // Затримка на ttl секунд
    console.log(await CRUDJT.read(token) === null);
    console.log(await CRUDJT.update(token, data) === false);
    console.log(await CRUDJT.delete(token) === false);

    console.log(await CRUDJT.update(token, data) === false);
    console.log(await CRUDJT.read(token) === null);

    // with silence_read
    console.log("Checking silence_read...");
    data = { user_id: 42, role: 11 };
    let silence_read = 6;
    let tokenWithsilence_read = await CRUDJT.create(data, -1, silence_read);

    let expectedsilence_read = silence_read - 1;
    for (let i = 0; i < silence_read; i++) {
        console.log(objectToString(await CRUDJT.read(tokenWithsilence_read)) === objectToString({ metadata: { silence_read: expectedsilence_read }, data: data }));
        expectedsilence_read -= 1;
    }
    console.log(await CRUDJT.read(tokenWithsilence_read) === null);

    // with ttl and silence_read
    console.log("Checking ttl and silence_read...");
    data = { user_id: 42, role: 11 };
    ttl = 5;
    silence_read = 5;
    expectedttl = 5;
    expectedsilence_read = silence_read - 1;
    let tokenWithttlAndsilence_read = await CRUDJT.create(data, ttl, silence_read);

    for (let i = 0; i < silence_read; i++) {
        console.log(objectToString(await CRUDJT.read(tokenWithttlAndsilence_read)) === objectToString({ metadata: { ttl: expectedttl, silence_read: expectedsilence_read }, data: data }));
        expectedttl -= 1;
        expectedsilence_read -= 1;

        await new Promise(resolve => setTimeout(resolve, 1000)); // sleep 1 second
    }
    console.log(await CRUDJT.read(tokenWithttlAndsilence_read) === null);

    // with scale load
    const REQUESTS = 40_000;

    for (let j = 0; j < 10; j++) {
        let tokens = [];
        data = {
            user_id: 414243,
            role: 11,
            devices: {
                ios_expired_at: "new Date().toString()",
                android_expired_at: "new Date().toString()",
                mobile_app_expired_at: "new Date().toString()",
                external_api_integration_expired_at: "new Date().toString()",
            },
            a: 42
        };
        edData = { user_id: 42, role: 11 };

        console.log('Checking scale load...');

        console.log('when creates 40k tokens with Turbo Queue');
        let start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            tokens.push(await CRUDJT.create(data));
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);

        console.log('when reads 40k tokens');
        let index = Math.floor(Math.random() * REQUESTS);
        start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            await CRUDJT.read(tokens[index]);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);

        console.log('when updates 40k tokens');
        start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            await CRUDJT.update(tokens[i], edData);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);

        console.log('when deletes 40k tokens');
        start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            await CRUDJT.delete(tokens[i]);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);
    }

    console.log('when caches after read from file system');

    const ttlGH = 2;

    data = {
        user_id: 414243,
        role: 11,
        devices: {
            ios_expired_at: new Date().toString(),
            android_expired_at: new Date().toString(),
            mobile_app_expired_at: new Date().toString(),
            external_api_integration_expired_at: new Date().toString(),
        },
        a: 42
    };

    let previoustokens = [];

    for (let i = 0; i < REQUESTS; i++) {
        previoustokens.push(await CRUDJT.create(data));
    }
    for (let i = 0; i < REQUESTS; i++) {
        await CRUDJT.create(data);
    }

    for (let i = 0; i < ttlGH; i++) {
        let start = performance.now();
        for (let j = 0; j < REQUESTS; j++) {
            await CRUDJT.read(previoustokens[j]);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);
    }
    await CRUDJT.Config.shutdownServer();
}

main().catch(console.error);
