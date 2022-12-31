import fetch, { AbortError } from 'node-fetch'
import fs from 'fs'
import path from "path";

const cookie = ''
const uid = ''
const xsrfToken = ''
const maxExtraRandomSleepTime = 1000 // sleep time is `base sleep time (1000ms)` + [0, maxExtraRandomSleepTime)

async function fetchToComplete(url, method = 'GET', body = null) {
    const call = async function () {

        const ac = new AbortController();
        const timeout = setTimeout(() => {
            ac.abort();
        }, 5000);

        try {
            const resp = await fetch(url, {
                'headers': {
                    'accept': '*/*',
                    "content-type": "application/json;charset=UTF-8",
                    'accept-language': 'zh-CN,zh;q=0.9',
                    'x-xsrf-token': xsrfToken,
                    'cookie': cookie,
                },
                signal: ac.signal,
                body,
                method,
            });

            if (method === 'POST' && resp.status === 400) {
                // 此条微博暂不支持变更可见范围
                return {
                    status: true,
                    body: {ok: 1}
                }
            }

            if (!resp.ok) {
                throw new Error('Status Code:' + resp.status)
            }

            return {
                status: resp.ok,
                body: await resp.json()
            }

        } catch (e) {
            console.log("DEBUG request failure:", e.message);
            return {
                status: false
            }
        } finally {
            clearTimeout(timeout)
        }
    }

    do {
        const resp = await call()
        if (resp.status) {
            return resp.body
        }

        // random sleep
        const sleepTime = Math.floor(Math.random() * maxExtraRandomSleepTime + 1000)
        console.log("DEBUG: random sleep time when error: ", sleepTime, 'ms');
        await new Promise(r => setTimeout(r, sleepTime))

    } while (true);
}

async function fetchIdsFromSinceId(sinceId = '') {
    console.log("DEBUG: Fetch Ids from:", sinceId);
    const json = await fetchToComplete(`https://weibo.com/ajax/statuses/mymblog?uid=${uid}&feature=0&since_id=${sinceId}`)

    return {
        nextSinceId: json.data.since_id,
        list: json.data.list.map(e => e.id)
    }

}

async function setPrivateById(id) {
    console.log("DEBUG: set private Id:", id);
    if (!id) {
        throw new Error('ERROR ID is ', id)
    }

    let idResult = {}
    if (fs.existsSync(path.join(uid, 'id-result.json'))) {
        idResult = JSON.parse(await fs.promises.readFile(path.join(uid, 'id-result.json')))
    }

    if (idResult[`${id}`]) {
        console.log(`${id} already done. Skip`);
        return 'skip'
    }

    const data = await fetchToComplete(`https://weibo.com/ajax/statuses/modifyVisible`, "POST", `{"ids":"${id}","visible":"1"}`)
    idResult[`${id}`] = data.ok === 1
    await fs.promises.writeFile(path.join(uid, 'id-result.json'), JSON.stringify(idResult))
    return 'ok'
}

async function fetchAllIds() {

    let sid
    let cList
    const idList = []
    do {
        const data = await fetchIdsFromSinceId(sid)
        sid = data.nextSinceId
        cList = data.list
        cList?.forEach(e => idList.push(e));
        console.log("DEBUG: Ids size: ", idList.length);

        // random sleep
        const sleepTime = Math.floor(Math.random() * maxExtraRandomSleepTime + 1000)
        console.log("DEBUG: random sleep time for next call: ", sleepTime, 'ms');
        await new Promise(r => setTimeout(r, sleepTime))

    } while (sid && cList);

    return idList
}

async function fetchIdAndSave() {
    if (fs.existsSync(path.join(uid, 'all-id.json'))) {
        throw new Error(`${uid}/all-id.json is existing. Please remove this file first before you want to re-fetch all IDs.`)
    }

    const data = await fetchAllIds()
    await fs.promises.writeFile('all-id.json', JSON.stringify(data))
}

async function setAllPrivate() {
    const data = JSON.parse(await fs.promises.readFile(path.join(uid, 'all-id.json')))
    let finish = 0
    for (const id of data) {
        const msg = await setPrivateById(id)
        if (msg !== 'skip') {
            const sleepTime = Math.floor(Math.random() * maxExtraRandomSleepTime + 1000)
            console.log("DEBUG: random sleep time for next call: ", sleepTime, 'ms');
            await new Promise(r => setTimeout(r, sleepTime))
        }
        finish++
        console.log(`DEBUG: progress: ${finish}/${data.length}`);
    }
}

async function beforeRun() {

    if (!cookie) {
        throw new Error('Set cookie first')
    }

    if (!uid) {
        throw new Error('Set uid first')
    }

    if (!xsrfToken) {
        throw new Error('Set xsrfToken first')
    }

    // create file
    if (!fs.existsSync(uid)) {
        fs.promises.mkdir(uid)
        fs.promises.writeFile(path.join(uid, 'id-result.json'), '{}')
    }
}

async function main() {
    await beforeRun()

    // Just need to run once and all ID will be saved to `all-id.json`
    // NOTD 1: There's a pre-check `all-id.json` file to avoid to get all IDs again so
    //          plese comment this line and just call the `setAllPrivate` function if you sure all IDs got successfully.
    // NOTE 2: Fetch IDs will fail if you hit weibo's 414 issue. 
    //          Please setup the sleep timeout (maxExtraRandomSleepTime) to let the request slow down 
    //          or change your Internet IP address if need
    //          more details: https://blog.csdn.net/weixin_30462049/article/details/96181873
    // await fetchIdAndSave()

    // Call it once fetch all IDs done. 
    // This function can be call much more time and it will skip the IDs which already set to private
    // NOTE 1: Don't to clean or remove `id-result.json` and that will let you lost all progress
    // NOTE 2: This also will fail if you hit weibo's 414 issue. 
    //          Please setup the sleep timeout (maxExtraRandomSleepTime) to let the request slow down 
    //          or change your Internet IP address if need
    //          more details: https://blog.csdn.net/weixin_30462049/article/details/96181873
    await setAllPrivate()
}


main().then().catch(e => {
    console.error(e.message);
})


///// 
async function test() {
    setPrivateById('4845041073783965')
}
//
// test().then()

