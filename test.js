const CRUD_JT = require('./index');
const { performance } = require('perf_hooks');
const os = require('os');

// Функція для рекурсивного сортування об'єктів
function sortObjectByKeyRecursive(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sorted = Object.keys(obj).sort().reduce((result, key) => {
        result[key] = sortObjectByKeyRecursive(obj[key]);
        return result;
    }, {});

    return sorted;
}

// Функція для перетворення об'єкта на рядок
function objectToString(obj) {
    return JSON.stringify(sortObjectByKeyRecursive(obj));
}

// Виводимо ОС
console.log(`OS: ${process.platform}`);
console.log(`CPU: ${os.arch()}`);

// Основна асинхронна функція
async function main() {
    // Без metadata
    console.log('Checking without metadata...');
    let data = { user_id: 42, role: 11 };
    let expectedData = sortObjectByKeyRecursive({ data: { ...data } });

    let edData = { user_id: 42, role: 8 };
    let expectedEdData = sortObjectByKeyRecursive({ data: { ...edData } });

    let token = CRUD_JT.create(data);

    console.log(objectToString(CRUD_JT.read(token)) === objectToString(expectedData));
    console.log(CRUD_JT.update(token, edData) === true);
    console.log(objectToString(CRUD_JT.read(token)) === objectToString(expectedEdData));
    console.log(CRUD_JT.delete(token) === true);
    console.log(CRUD_JT.read(token) === null);

    // З metadata
    console.log('Checking ttl...');
    data = { user_id: 42, role: 11 };

    let ttl = 5;
    let tokenWithttl = CRUD_JT.create(data, ttl);

    let expectedttl = ttl;
    for (let i = 0; i < ttl; i++) {
        console.log(objectToString(CRUD_JT.read(tokenWithttl)) === objectToString({ metadata: { ttl: expectedttl }, data: data }));
        expectedttl -= 1;

        await new Promise(resolve => setTimeout(resolve, 1000)); // Затримка 1 секунда
    }
    console.log(CRUD_JT.read(tokenWithttl) === null);

    // Коли ttl закінчився
    console.log('when expired ttl');
    data = { user_id: 42, role: 11 };
    ttl = 1;
    token = CRUD_JT.create(data, ttl);
    await new Promise(resolve => setTimeout(resolve, ttl * 1000)); // Затримка на ttl секунд
    console.log(CRUD_JT.read(token) === null);
    console.log(CRUD_JT.update(token, data) === false);
    console.log(CRUD_JT.delete(token) === false);

    console.log(CRUD_JT.update(token, data) === false);
    console.log(CRUD_JT.read(token) === null);

    // З silence_read
    console.log("Checking silence_read...");
    data = { user_id: 42, role: 11 };
    let silence_read = 6;
    let tokenWithsilence_read = CRUD_JT.create(data, -1, silence_read);

    let expectedsilence_read = silence_read - 1;
    for (let i = 0; i < silence_read; i++) {
        console.log(objectToString(CRUD_JT.read(tokenWithsilence_read)) === objectToString({ metadata: { silence_read: expectedsilence_read }, data: data }));
        expectedsilence_read -= 1;
    }
    console.log(CRUD_JT.read(tokenWithsilence_read) === null);

    // З ttl і silence_read
    console.log("Checking ttl and silence_read...");
    data = { user_id: 42, role: 11 };
    ttl = 5;
    silence_read = 5;
    expectedttl = 5;
    expectedsilence_read = silence_read - 1;
    let tokenWithttlAndsilence_read = CRUD_JT.create(data, ttl, silence_read);

    // let expectedttlAndsilence_read = {
    //     ttl: expectedttl,
    //     silence_read: expectedsilence_read,
    // };
    for (let i = 0; i < silence_read; i++) {
        // console.log(objectToString(CRUD_JT.read(tokenWithttlAndsilence_read)));
        // console.log(objectToString({ metadata: { ttl: expectedttl, silence_read: expectedsilence_read }, data: data }));
        // console.log(objectToString({ metadata: expectedttlAndsilence_read, data: data }));

        console.log(objectToString(CRUD_JT.read(tokenWithttlAndsilence_read)) === objectToString({ metadata: { ttl: expectedttl, silence_read: expectedsilence_read }, data: data }));
        expectedttl -= 1;
        expectedsilence_read -= 1;

        await new Promise(resolve => setTimeout(resolve, 1000)); // Затримка 1 секунда
    }
    console.log(CRUD_JT.read(tokenWithttlAndsilence_read) === null);

    // З масштабним навантаженням
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

        // Коли q
        console.log('when creates 40k tokens with Turbo Queue');
        let start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            tokens.push(CRUD_JT.create(data));
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);

        // Коли w
        console.log('when reads 40k tokens');
        let index = Math.floor(Math.random() * REQUESTS);
        start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            CRUD_JT.read(tokens[index]);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);

        // Коли e
        console.log('when updates 40k tokens');
        start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            CRUD_JT.update(tokens[i], edData);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);

        // Коли r
        console.log('when deletes 40k tokens');
        start = performance.now();
        for (let i = 0; i < REQUESTS; i++) {
            CRUD_JT.delete(tokens[i]);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);
    }

    // Коли кеш після w з файлової системи
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
        previoustokens.push(CRUD_JT.create(data));
    }
    for (let i = 0; i < REQUESTS; i++) {
        CRUD_JT.create(data);
    }

    for (let i = 0; i < ttlGH; i++) {
        let start = performance.now();
        for (let j = 0; j < REQUESTS; j++) {
            CRUD_JT.read(previoustokens[j]);
        }
        console.log(`Elapsed time: ${((performance.now() - start) / 1000).toFixed(3)}`);
    }
}

// Викликаємо основну функцію
main().catch(console.error);
