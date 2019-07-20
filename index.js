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

    let template = await fs.promises.readFile('res/question-request-template.json');
    template = JSON.parse(template);

    for (let question of all.stat_status_pairs) {
        if (question.paid_only) {
            continue;
        }

        let id = question.stat.frontend_question_id;
        let outputPath = `build/questions/${id}.json`;

        if (await fsExists(outputPath)) {
            continue;
        }

        let name = question.stat.question__title_slug;
        let headers = template.headers;
        let body = template.body.replace('{0}', name);
        headers['Content-Length'] = body.length;

        let init = {
            method: 'POST',
            headers: headers,
            body: body,
        };

        let res = await fetch('https://leetcode.com/graphql', init);
        let questionData = await res.json();
        await fs.promises.writeFile(outputPath, JSON.stringify(questionData, null, 4));

        await sleep(2000);
    }
}

run();
