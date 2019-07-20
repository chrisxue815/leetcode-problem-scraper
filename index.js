const fs = require('fs');
const fetch = require('node-fetch');

const allJsonPath = 'build/all.json';

async function fsExists(path) {
    try {
        await fs.promises.stat(path);
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    let res = await fetch('https://leetcode.com/api/problems/all/');
    let all = await res.json();
    await fs.promises.writeFile(allJsonPath, JSON.stringify(all, null, 4));

    let template = await fs.promises.readFile('res/problem-request-template.json');
    template = JSON.parse(template);

    for (let problem of all.stat_status_pairs) {
        if (problem.paid_only) {
            continue;
        }

        let id = problem.stat.frontend_question_id;
        let outputPath = `build/problems/${id}.json`;

        if (await fsExists(outputPath)) {
            continue;
        }

        let name = problem.stat.question__title_slug;
        let headers = template.headers;
        let body = template.body.replace('{0}', name);
        headers['Content-Length'] = body.length;

        let init = {
            method: 'POST',
            headers: headers,
            body: body,
        };

        let res = await fetch('https://leetcode.com/graphql', init);
        let problemData = await res.json();
        await fs.promises.writeFile(outputPath, JSON.stringify(problemData, null, 4));

        await sleep(2000);
    }
}

run();
